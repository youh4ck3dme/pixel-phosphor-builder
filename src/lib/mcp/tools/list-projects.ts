import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_projects",
  title: "List projects",
  description: "List the signed-in user's builder projects, newest first.",
  inputSchema: { limit: z.number().int().optional().describe("Max projects to return (default 25).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, slug, visibility, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { projects: data ?? [] },
    };
  },
});