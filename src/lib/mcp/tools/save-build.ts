import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "save_build",
  title: "Save build",
  description:
    "Save a new HTML build version. Provide an existing project_id, or a project_name to create a new project.",
  inputSchema: {
    prompt: z.string().describe("The prompt or description behind this build."),
    html: z.string().describe("Complete self-contained HTML document."),
    project_id: z.string().optional().describe("Existing project id to add this build to."),
    project_name: z.string().optional().describe("Name for a new project when project_id is omitted."),
    parent_build_id: z.string().optional().describe("Build this version branches from."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ prompt, html, project_id, project_name, parent_build_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const userId = ctx.getUserId();
    if (!userId) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let projectId = project_id ?? null;
    if (!projectId) {
      const name = (project_name ?? prompt).slice(0, 60).trim() || "Untitled build";
      const slug = `${
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "untitled"
      }-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("projects")
        .insert({ owner_id: userId, name, slug })
        .select("id, name, slug")
        .single();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      projectId = data.id;
    }

    const { data: build, error: buildError } = await supabase
      .from("builds")
      .insert({
        project_id: projectId,
        owner_id: userId,
        prompt,
        html,
        model: "mcp",
        parent_build_id: parent_build_id ?? null,
      })
      .select("id, project_id, created_at")
      .single();
    if (buildError) return { content: [{ type: "text", text: buildError.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(build) }],
      structuredContent: { build },
    };
  },
});