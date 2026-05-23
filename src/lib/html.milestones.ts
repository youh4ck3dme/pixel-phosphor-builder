export type Milestone =
  | "doctype"
  | "head"
  | "styles"
  | "body"
  | "section1"
  | "scripts"
  | "done";

export const MILESTONE_ORDER: Milestone[] = [
  "doctype",
  "head",
  "styles",
  "body",
  "section1",
  "scripts",
  "done",
];

export const MILESTONE_LABEL: Record<Milestone, string> = {
  doctype: "doctype",
  head: "head",
  styles: "styles",
  body: "body",
  section1: "section",
  scripts: "scripts",
  done: "done",
};

export function detectMilestones(html: string): Set<Milestone> {
  const found = new Set<Milestone>();
  const lower = html.toLowerCase();
  if (/<!doctype/i.test(lower)) found.add("doctype");
  if (lower.includes("<head")) found.add("head");
  if (lower.includes("</style") || lower.includes("</head")) found.add("styles");
  if (lower.includes("<body")) found.add("body");
  if (
    lower.includes("<section") ||
    lower.includes("<main") ||
    lower.includes("<header")
  )
    found.add("section1");
  if (lower.includes("</script") || lower.includes("</body")) found.add("scripts");
  if (lower.includes("</html")) found.add("done");
  return found;
}

/** Returns true when the doc has at least head + body so iframe render is safe. */
export function isRenderable(html: string): boolean {
  const lower = html.toLowerCase();
  return lower.includes("<body") && (lower.includes("</head") || lower.includes("</style"));
}