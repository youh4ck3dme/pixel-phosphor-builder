import * as React from "react";
import { MILESTONE_LABEL, MILESTONE_ORDER, type Milestone } from "@/lib/html.milestones";

export function StreamTimeline({
  reached,
  active,
}: {
  reached: Set<Milestone>;
  active: boolean;
}) {
  return (
    <div className="hairline-bottom flex items-center gap-1 overflow-x-auto px-3 py-1.5 no-scrollbar">
      {MILESTONE_ORDER.map((m, i) => {
        const hit = reached.has(m);
        const isNext = !hit && active && MILESTONE_ORDER.slice(0, i).every((p) => reached.has(p));
        return (
          <React.Fragment key={m}>
            {i > 0 && (
              <span
                className="h-[1px] w-3 shrink-0"
                style={{
                  background: hit
                    ? "var(--phosphor)"
                    : "color-mix(in oklab, var(--foreground) 12%, transparent)",
                }}
              />
            )}
            <span className="flex shrink-0 items-center gap-1">
              <span
                className={`size-1.5 rounded-full ${isNext ? "animate-phosphor" : ""}`}
                style={{
                  background: hit
                    ? "var(--phosphor)"
                    : isNext
                      ? "var(--amber)"
                      : "color-mix(in oklab, var(--foreground) 18%, transparent)",
                  boxShadow: hit ? "0 0 6px var(--phosphor)" : "none",
                }}
              />
              <span
                className="font-mono text-[9px] uppercase tracking-widest"
                style={{
                  color: hit
                    ? "var(--phosphor)"
                    : isNext
                      ? "var(--amber)"
                      : "color-mix(in oklab, var(--foreground) 35%, transparent)",
                }}
              >
                {MILESTONE_LABEL[m]}
              </span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}