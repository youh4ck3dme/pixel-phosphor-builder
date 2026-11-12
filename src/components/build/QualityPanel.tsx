import * as React from "react";
import { auditHtml, type QualityCheck } from "@/lib/html.quality";
import { guardFixPrompt, type PreviewError } from "@/lib/preview.errors";

export function QualityPanel({
  html,
  runtimeErrors,
  onFix,
}: {
  html: string;
  runtimeErrors?: PreviewError[];
  onFix: (fixPrompt: string) => void;
}) {
  const report = React.useMemo(() => auditHtml(html), [html]);

  if (!html.trim()) {
    return (
      <div className="grid h-full place-items-center">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          ▒▒▒ nothing to audit yet ▒▒▒
        </span>
      </div>
    );
  }

  const errors = runtimeErrors ?? [];

  const groups: { key: QualityCheck["category"]; label: string }[] = [
    { key: "a11y", label: "Accessibility" },
    { key: "seo", label: "SEO" },
    { key: "perf", label: "Performance" },
  ];
  const failing = report.checks.filter((c) => !c.pass);
  const accent =
    report.score >= 80 ? "var(--phosphor)" : report.score >= 50 ? "var(--amber)" : "var(--destructive, #ef4444)";

  return (
    <div className="h-full overflow-y-auto px-3 py-3">
      <div className="flex items-center gap-3 rounded-[5px] bg-surface hairline px-3 py-2.5">
        <span className="font-mono text-2xl tabular-nums" style={{ color: accent }}>
          {report.score}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            quality score
          </div>
          <div
            className="mt-1 h-[2px] w-full overflow-hidden rounded-full"
            style={{ background: "color-mix(in oklab, var(--foreground) 8%, transparent)" }}
          >
            <div
              className="h-full transition-[width] duration-500"
              style={{ width: `${report.score}%`, background: accent, boxShadow: `0 0 8px -1px ${accent}` }}
            />
          </div>
        </div>
      </div>

      {failing.length > 0 && (
        <div className="mt-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            one-tap fixes
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {failing.map(
              (c) =>
                c.fixPrompt && (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onFix(c.fixPrompt!)}
                    className="rounded-[5px] px-2 py-1 font-mono text-[10px] tracking-wide transition-colors"
                    style={{
                      background: "var(--amber-dim)",
                      color: "var(--amber)",
                    }}
                  >
                    fix · {c.label}
                  </button>
                ),
            )}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            guard · runtime
            <span
              className="size-1.5 rounded-full"
              style={{ background: "var(--destructive, #ef4444)", boxShadow: "0 0 6px var(--destructive, #ef4444)" }}
            />
            <span style={{ color: "var(--destructive, #ef4444)" }}>{errors.length}</span>
          </div>
          <ul className="mt-1.5 divide-y divide-white/5 rounded-[5px] bg-surface hairline">
            {errors.map((e) => (
              <li key={e.key} className="px-2.5 py-1.5">
                <div className="truncate font-mono text-[11px] text-foreground/85" title={e.message}>
                  {e.lineno ? `L${e.lineno}: ` : ""}{e.message}
                </div>
                <button
                  type="button"
                  onClick={() => onFix(guardFixPrompt(e))}
                  className="mt-1 rounded-[5px] px-2 py-1 font-mono text-[10px] tracking-wide transition-colors"
                  style={{ background: "var(--amber-dim)", color: "var(--amber)" }}
                >
                  fix · runtime guard
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups.map((g) => {
        const items = report.checks.filter((c) => c.category === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key} className="mt-3">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {g.label}
            </div>
            <ul className="mt-1 divide-y divide-white/5 rounded-[5px] bg-surface hairline">
              {items.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-2.5 py-1.5">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{
                      background: c.pass ? "var(--phosphor)" : "var(--destructive, #ef4444)",
                      boxShadow: c.pass ? "0 0 6px var(--phosphor)" : "none",
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/85">
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}