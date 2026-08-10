import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_builds",
  title: "List builds",
  description:
    "List builds (generated HTML versions) for one of the user's projects. Returns metadata and prompts, not the HTML.",
  inputSchema: {
    project_id: z.string().describe("Project id from list_projects."),
    limit: z.number().int().optional().describe("Max builds to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("builds")
      .select("id, project_id, prompt, model, parent_build_id, created_at")
      .eq("project_id", project_id)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { builds: data ?? [] },
    };
  },
});