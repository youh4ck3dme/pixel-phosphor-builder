import { supabase } from "@/integrations/supabase/client";

export type CloudProject = {
  id: string;
  name: string;
  slug: string;
  visibility: "private" | "unlisted" | "public";
  updated_at: string;
  created_at: string;
};

export type CloudBuild = {
  id: string;
  project_id: string;
  prompt: string;
  html: string;
  model: string;
  parent_build_id: string | null;
  created_at: string;
};

function slugify(s: string) {
  const base = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "untitled";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function listProjects(): Promise<CloudProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, slug, visibility, updated_at, created_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CloudProject[];
}

export async function listBuilds(projectId: string): Promise<CloudBuild[]> {
  const { data, error } = await supabase
    .from("builds")
    .select("id, project_id, prompt, html, model, parent_build_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CloudBuild[];
}

export async function getBuildById(id: string): Promise<CloudBuild | null> {
  const { data, error } = await supabase
    .from("builds")
    .select("id, project_id, prompt, html, model, parent_build_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as CloudBuild | null) ?? null;
}

/**
 * Save a build under a project. If projectId is null, creates a new project
 * (named after the prompt) and returns its id along with the build.
 */
export async function saveCloudBuild(input: {
  projectId: string | null;
  prompt: string;
  html: string;
  model: string;
  parentBuildId?: string | null;
}): Promise<{ project: CloudProject; build: CloudBuild }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  let projectId = input.projectId;
  let project: CloudProject;

  if (!projectId) {
    const name = input.prompt.slice(0, 60).trim() || "Untitled build";
    const { data, error } = await supabase
      .from("projects")
      .insert({ owner_id: userId, name, slug: slugify(name), visibility: "private" })
      .select("id, name, slug, visibility, updated_at, created_at")
      .single();
    if (error) throw error;
    project = data as CloudProject;
    projectId = project.id;
  } else {
    // touch updated_at
    const { data, error } = await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", projectId)
      .select("id, name, slug, visibility, updated_at, created_at")
      .single();
    if (error) throw error;
    project = data as CloudProject;
  }

  const { data: build, error: buildErr } = await supabase
    .from("builds")
    .insert({
      project_id: projectId,
      owner_id: userId,
      prompt: input.prompt,
      html: input.html,
      model: input.model,
      parent_build_id: input.parentBuildId ?? null,
    })
    .select("id, project_id, prompt, html, model, parent_build_id, created_at")
    .single();
  if (buildErr) throw buildErr;

  return { project, build: build as CloudBuild };
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("projects").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function setProjectVisibility(
  id: string,
  visibility: "private" | "unlisted" | "public",
): Promise<void> {
  const { error } = await supabase.from("projects").update({ visibility }).eq("id", id);
  if (error) throw error;
}

export async function getProjectBySlug(slug: string): Promise<CloudProject | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, slug, visibility, updated_at, created_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as CloudProject | null) ?? null;
}

export async function getLatestBuildForProject(projectId: string): Promise<CloudBuild | null> {
  const { data, error } = await supabase
    .from("builds")
    .select("id, project_id, prompt, html, model, parent_build_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CloudBuild | null) ?? null;
}

/** Duplicate a build (and its prompt+html) into the current user's account as a new project. */
export async function remixBuild(sourceBuildId: string): Promise<{ project: CloudProject; build: CloudBuild }> {
  const src = await getBuildById(sourceBuildId);
  if (!src) throw new Error("Build not found");
  return saveCloudBuild({
    projectId: null,
    prompt: `Remix: ${src.prompt}`,
    html: src.html,
    model: src.model,
  });
}

/** One-time migration: copy localStorage builds into the cloud as separate projects. */
const MIGRATED_KEY = "h4ckd:migrated_v1";
const LEGACY_KEY = "h4ckd:builds";

export async function migrateLocalBuildsIfNeeded(): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (localStorage.getItem(MIGRATED_KEY)) return 0;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATED_KEY, "1");
    return 0;
  }
  let parsed: Array<{ id: string; prompt: string; html: string; model: string; createdAt: number }> = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.setItem(MIGRATED_KEY, "1");
    return 0;
  }
  let migrated = 0;
  for (const b of parsed) {
    try {
      await saveCloudBuild({
        projectId: null,
        prompt: b.prompt,
        html: b.html,
        model: b.model || "flash",
      });
      migrated++;
    } catch {
      /* skip */
    }
  }
  localStorage.setItem(MIGRATED_KEY, "1");
  if (migrated > 0) localStorage.removeItem(LEGACY_KEY);
  return migrated;
}