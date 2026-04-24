import * as React from "react";

export type StreamPhase = "idle" | "requesting" | "streaming" | "rendering" | "done" | "error";

const PHASES: { key: StreamPhase; label: string }[] = [
  { key: "requesting", label: "Request" },
  { key: "streaming", label: "Stream" },
  { key: "rendering", label: "Render" },
  { key: "done", label: "Done" },
];

const ORDER: Record<StreamPhase, number> = {
  idle: -1,
  requesting: 0,
  streaming: 1,
  rendering: 2,
  done: 3,
  error: 3,
};

export function StreamProgress({
  phase,
  bytes,
  elapsedMs,
}: {
  phase: StreamPhase;
  bytes: number;
  elapsedMs: number;
}) {
  if (phase === "idle") return null;

  const current = ORDER[phase];
  const pct =
    phase === "done"
      ? 100
      : phase === "error"
        ? 100
        : Math.min(95, ((current + 0.5) / PHASES.length) * 100);

  const isError = phase === "error";
  const accent = isError ? "var(--destructive, #ef4444)" : "var(--phosphor)";

  return (
    <div
      className="hairline-bottom px-3 py-1.5 bg-background/85 backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {phase !== "done" && phase !== "error" && (
            <span
              className="size-1.5 rounded-full animate-phosphor shrink-0"
              style={{ background: accent }}
            />
          )}
          <span
            className="font-mono text-[10px] uppercase tracking-widest truncate"
            style={{ color: accent }}
          >
            {phase === "requesting" && "Contacting model…"}
            {phase === "streaming" && "Streaming tokens…"}
            {phase === "rendering" && "Rendering preview…"}
            {phase === "done" && "Complete"}
            {phase === "error" && "Failed"}
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground tabular-nums shrink-0">
          {formatBytes(bytes)} · {(elapsedMs / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Phase pips */}
      <div className="flex items-center gap-1 mb-1.5">
        {PHASES.map((p, i) => {
          const reached = i <= current;
          const active = i === current && phase !== "done" && phase !== "error";
          return (
            <div key={p.key} className="flex-1 flex items-center gap-1 min-w-0">
              <div
                className="h-[2px] flex-1 rounded-full transition-colors"
                style={{
                  background: reached
                    ? accent
                    : "color-mix(in oklab, var(--foreground) 12%, transparent)",
                  boxShadow: active ? `0 0 6px ${accent}` : "none",
                }}
              />
              <span
                className="font-mono text-[9px] uppercase tracking-widest hidden min-[380px]:inline"
                style={{
                  color: reached
                    ? accent
                    : "color-mix(in oklab, var(--foreground) 35%, transparent)",
                }}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Continuous bar */}
      <div
        className="h-[2px] w-full overflow-hidden rounded-full"
        style={{ background: "color-mix(in oklab, var(--foreground) 8%, transparent)" }}
      >
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, var(--amber), ${accent})`,
            boxShadow: `0 0 8px -1px ${accent}`,
          }}
        />
      </div>
    </div>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}