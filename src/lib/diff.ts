import { diffLines, type Change } from "diff";

export type DiffLine = {
  kind: "add" | "del" | "ctx";
  text: string;
};

/** Produce a flat line-level diff for side-by-side rendering. */
export function computeLineDiff(a: string, b: string): DiffLine[] {
  const parts: Change[] = diffLines(a || "", b || "");
  const out: DiffLine[] = [];
  for (const p of parts) {
    const lines = p.value.split("\n");
    // diffLines keeps trailing newline as empty string — drop it
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    for (const line of lines) {
      out.push({
        kind: p.added ? "add" : p.removed ? "del" : "ctx",
        text: line,
      });
    }
  }
  return out;
}

/** Rough percentage of B that differs from A (0..1). */
export function diffRatio(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a || !b) return 1;
  const parts = diffLines(a, b);
  let changed = 0;
  let total = 0;
  for (const p of parts) {
    const len = p.value.length;
    total += len;
    if (p.added || p.removed) changed += len;
  }
  return total === 0 ? 0 : changed / total;
}