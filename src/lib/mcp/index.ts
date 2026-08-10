import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProjects from "./tools/list-projects";
import listBuilds from "./tools/list-builds";
import getBuild from "./tools/get-build";
import saveBuild from "./tools/save-build";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "apex-builder",
  title: "Apex Builder",
  version: "0.1.0",
  instructions:
    "Tools for Apex Builder, an AI HTML page builder. Use `list_projects` to find projects, `list_builds` for versions inside a project, `get_build` to read a build's full HTML, and `save_build` to store a new HTML build version. All tools act as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProjects, listBuilds, getBuild, saveBuild],
});