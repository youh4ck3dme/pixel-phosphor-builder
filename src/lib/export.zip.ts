import JSZip from "jszip";

export async function exportBuildZip(opts: {
  html: string;
  prompt: string;
  title: string;
  model?: string;
}) {
  const zip = new JSZip();
  zip.file("index.html", opts.html);
  zip.file(
    "README.md",
    [
      `# ${opts.title}`,
      "",
      `Generated with H4CK3D (${opts.model ?? "flash"}).`,
      "",
      "## Prompt",
      "",
      "```",
      opts.prompt,
      "```",
      "",
      `Created: ${new Date().toISOString()}`,
      "",
    ].join("\n"),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = opts.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "build";
  a.download = `${safe}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}