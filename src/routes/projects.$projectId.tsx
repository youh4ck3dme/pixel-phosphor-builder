import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Share2, Star, GitCompare, Plus } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listBuilds,
  listProjects,
  type CloudBuild,
  type CloudProject,
} from "@/lib/builds.cloud";
import { buildTreeFromList } from "@/lib/builds.tree";
import { BuildTree } from "@/components/builder/BuildTree";
import { ShareSheet } from "@/components/builder/ShareSheet";
import { SnapshotsDrawer } from "@/components/builder/SnapshotsDrawer";
import { createSnapshot } from "@/lib/snapshots";
import { tap } from "@/hooks/useHaptic";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project — H4CK3D" },
      { name: "description", content: "Build history tree." },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [project, setProject] = React.useState<CloudProject | null>(null);
  const [builds, setBuilds] = React.useState<CloudBuild[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [snapsOpen, setSnapsOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [all, bs] = await Promise.all([
        listProjects(),
        listBuilds(projectId),
      ]);
      setProject(all.find((p) => p.id === projectId) ?? null);
      setBuilds(bs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);
      void load();
    });
  }, [load]);

  const tree = React.useMemo(() => buildTreeFromList(builds), [builds]);

  function onOpen(buildId: string) {
    navigate({ to: "/build", search: { id: buildId } });
  }
  function onBranch(buildId: string) {
    navigate({ to: "/build", search: { id: buildId } });
    toast.message("Iterate to branch");
  }
  async function onSnapshot(buildId: string) {
    const label = window.prompt("Snapshot label", `v${builds.length}`);
    if (!label) return;
    try {
      await createSnapshot({ buildId, projectId, label });
      toast.success("Snapshot saved");
      tap();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Snapshot failed");
    }
  }
  function onToggleSelect(buildId: string) {
    setSelected((prev) => {
      if (prev.includes(buildId)) return prev.filter((x) => x !== buildId);
      if (prev.length >= 2) return [prev[1], buildId];
      return [...prev, buildId];
    });
    tap(6);
  }

  function openDiff() {
    if (selected.length !== 2) {
      toast.message("Select 2 builds to diff");
      return;
    }
    navigate({ to: "/diff", search: { a: selected[0], b: selected[1] } });
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <Toaster theme="dark" position="top-center" />
      <header className="hairline-bottom px-3 py-3 flex items-center gap-2">
        <Link to="/projects" className="size-9 rounded-[5px] grid place-items-center hairline" aria-label="Back" onClick={() => tap()}>
          <ArrowLeft className="size-4" />
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground truncate flex-1">
          {project?.name ?? "Project"}
        </span>
        <button
          onClick={() => setSnapsOpen(true)}
          aria-label="Snapshots"
          className="size-9 grid place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber"
        >
          <Star className="size-4" />
        </button>
        <button
          onClick={() => setShareOpen(true)}
          aria-label="Share"
          className="size-9 grid place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber"
        >
          <Share2 className="size-4" />
        </button>
        <Link
          to="/build"
          search={{}}
          aria-label="New build"
          onClick={() => tap()}
          className="size-9 grid place-items-center rounded-[5px] bg-amber text-black"
        >
          <Plus className="size-4" />
        </Link>
      </header>

      <div className="flex-1 mx-auto w-full max-w-[640px] px-3 py-3">
        {loading && (
          <div className="grid place-items-center py-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && authed === false && (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">Sign in to view this project.</p>
            <Link
              to="/auth"
              className="mt-4 inline-block rounded-[5px] px-4 py-2 text-sm font-mono uppercase tracking-widest text-background"
              style={{ background: "var(--phosphor)" }}
            >
              Sign in
            </Link>
          </div>
        )}
        {!loading && authed && (
          <>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              {builds.length} build{builds.length === 1 ? "" : "s"} · visibility: {project?.visibility}
            </div>
            <BuildTree
              roots={tree}
              activeId={null}
              selectedIds={selected}
              onOpen={onOpen}
              onBranch={onBranch}
              onSnapshot={onSnapshot}
              onToggleSelect={onToggleSelect}
            />
          </>
        )}
      </div>

      {selected.length === 2 && (
        <div className="sticky bottom-0 hairline-top bg-background/85 backdrop-blur-xl px-3 py-2 flex items-center gap-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-amber flex-1">
            2 selected
          </span>
          <button
            onClick={() => setSelected([])}
            className="rounded-[5px] hairline px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            Clear
          </button>
          <button
            onClick={openDiff}
            className="inline-flex items-center gap-1.5 rounded-[5px] bg-phosphor text-background px-3 py-2 font-mono text-[10px] uppercase tracking-widest"
          >
            <GitCompare className="size-3.5" /> Diff
          </button>
        </div>
      )}

      {project && (
        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          projectId={project.id}
          slug={project.slug}
          visibility={project.visibility as "private" | "unlisted" | "public"}
          onVisibilityChange={(v) => setProject({ ...project, visibility: v })}
        />
      )}
      <SnapshotsDrawer
        open={snapsOpen}
        onClose={() => setSnapsOpen(false)}
        projectId={projectId}
        onOpenBuild={onOpen}
      />
    </main>
  );
}