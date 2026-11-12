import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SYSTEM_PROMPT } from "@/lib/ai";
import type { StreamPhase } from "@/components/phosphor/StreamProgress";

const PHASE_STYLE: Record<StreamPhase, { color: string; glow: boolean }> = {
  idle: { color: "var(--muted-foreground)", glow: false },
  requesting: { color: "var(--amber)", glow: true },
  streaming: { color: "var(--phosphor)", glow: true },
  rendering: { color: "var(--phosphor)", glow: true },
  done: { color: "var(--phosphor)", glow: false },
  error: { color: "var(--destructive)", glow: true },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </div>
  );
}

function StatRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</span>
      <span
        className="font-mono text-[11px] font-medium tabular-nums"
        style={{ color: accent ? "var(--phosphor)" : "var(--foreground)" }}
      >
        {v}
      </span>
    </div>
  );
}

export function StudioInspector({
  open,
  onClose,
  model,
  onModelChange,
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokens,
  streaming,
  phase,
  docKB,
  latencyMs,
  milestonesDone,
  milestonesTotal,
}: {
  open: boolean;
  onClose: () => void;
  model: "flash" | "pro";
  onModelChange: (m: "flash" | "pro") => void;
  temperature: number;
  onTemperatureChange: (t: number) => void;
  maxTokens: number;
  onMaxTokens: (n: number) => void;
  streaming: boolean;
  phase: StreamPhase;
  docKB: number;
  latencyMs: number | null;
  milestonesDone: number;
  milestonesTotal: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            key="drawer"
            initial={{ x: 288 }}
            animate={{ x: 0 }}
            exit={{ x: 288 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-72 flex-col min-h-0"
            style={{
              background: "rgba(8,8,8,0.94)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
            }}
            aria-label="Studio inspector"
          >
            <div className="flex shrink-0 items-center justify-between px-3 py-2 hairline-bottom">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber">Inspector</span>
              <button
                onClick={onClose}
                aria-label="Close inspector"
                className="grid size-7 place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto no-scrollbar p-3">
              {/* Model */}
              <section>
                <SectionLabel>Model</SectionLabel>
                <div className="flex rounded-[5px] bg-surface hairline p-0.5">
                  {(["flash", "pro"] as const).map((m) => {
                    const active = model === m;
                    return (
                      <button
                        key={m}
                        onClick={() => onModelChange(m)}
                        aria-pressed={active}
                        className="flex-1 rounded-[4px] px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-widest transition-colors"
                        style={{
                          background: active ? "var(--amber-dim)" : "transparent",
                          color: active ? "var(--amber)" : "var(--muted-foreground)",
                        }}
                      >
                        {m === "flash" ? "Mistral Small" : "Mistral Large"}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Generation parameters */}
              <section>
                <SectionLabel>Parameters</SectionLabel>
                <label className="mb-1 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">Temperature</span>
                  <span className="font-mono text-[11px] tabular-nums text-foreground">{temperature.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => onTemperatureChange(Number(e.target.value))}
                  className="w-full accent-amber"
                  aria-label="Temperature"
                />
                <label className="mb-1 mt-3 flex items-baseline justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">Max tokens</span>
                  <span className="font-mono text-[11px] tabular-nums text-foreground">{maxTokens}</span>
                </label>
                <input
                  type="range"
                  min={1024}
                  max={16384}
                  step={512}
                  value={maxTokens}
                  onChange={(e) => onMaxTokens(Number(e.target.value))}
                  className="w-full accent-amber"
                  aria-label="Max tokens"
                />
              </section>

              {/* Telemetry */}
              <section>
                <SectionLabel>Telemetry</SectionLabel>
                <div className="rounded-[5px] bg-surface hairline px-2.5 py-1">
                  <StatRow k="Doc weight" v={`${docKB.toFixed(1)} KB`} />
                  <StatRow k="Latency" v={latencyMs !== null ? `${latencyMs} ms` : "—"} />
                  <StatRow k="Milestones" v={`${milestonesDone}/${milestonesTotal}`} accent={milestonesDone === milestonesTotal} />
                  <div className="flex items-baseline justify-between gap-2 py-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">State</span>
                    <span
                      className="flex items-center gap-1.5 font-mono text-[11px] font-medium"
                      style={{ color: PHASE_STYLE[phase].color }}
                    >
                      <span
                        className={`size-1.5 rounded-full ${phase === "streaming" || phase === "requesting" ? "animate-phosphor" : ""}`}
                        style={{
                          background: PHASE_STYLE[phase].color,
                          boxShadow: PHASE_STYLE[phase].glow
                            ? `0 0 8px ${PHASE_STYLE[phase].color}`
                            : "none",
                        }}
                      />
                      {phase}
                    </span>
                  </div>
                </div>
              </section>

              {/* System directives */}
              <section>
                <details className="rounded-[5px] bg-surface hairline">
                  <summary className="cursor-pointer select-none px-2.5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-amber">
                    System directives
                  </summary>
                  <pre
                    className="max-h-64 overflow-y-auto no-scrollbar whitespace-pre-wrap border-t hairline-top px-2.5 py-2 font-mono text-[9px] leading-relaxed text-muted-foreground/80"
                    style={{ borderTopWidth: 1 }}
                  >
                    {SYSTEM_PROMPT}
                  </pre>
                </details>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
