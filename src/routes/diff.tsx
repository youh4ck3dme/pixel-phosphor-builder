import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Code2, Eye, Layers, Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { getBuildById, type CloudBuild } from "@/lib/builds.cloud";
import { computeLineDiff } from "@/lib/diff";
import { tap } from "@/hooks/useHaptic";

type Search = { a?: string; b?: string };
type Phase = "idle" | "fetch-a" | "fetch-b" | "diffing" | "rendering" | "done" | "error";

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Idle",
  "fetch-a": "Fetching build A…",
  "fetch-b": "Fetching build B…",
  diffing: "Computing diff…",
  rendering: "Rendering preview…",
  done: "Ready",
  error: "Failed",
};

const PHASE_ORDER: Phase[] = ["fetch-a", "fetch-b", "diffing", "rendering", "done"];

// Relative weights per phase (sum = 1.0). Used for overall % + ETA.
const PHASE_WEIGHT: Record<Exclude<Phase, "idle" | "done" | "error">, number> = {
  "fetch-a": 0.35,
  "fetch-b": 0.35,
  diffing: 0.2,
  rendering: 0.1,
};
// Default expected duration per phase (ms) — refined as real samples arrive.
const PHASE_DEFAULT_MS: Record<Exclude<Phase, "idle" | "done" | "error">, number> = {
  "fetch-a": 800,
  "fetch-b": 800,
  diffing: 250,
  rendering: 200,
};

type PhaseTimings = Partial<Record<Phase, number>>;

function computeProgress(
  phase: Phase,
  phaseStart: number,
  now: number,
  timings: PhaseTimings,
): { pct: number; etaMs: number } {
  if (phase === "done") return { pct: 100, etaMs: 0 };
  if (phase === "error" || phase === "idle") return { pct: 0, etaMs: 0 };

  let completedWeight = 0;
  let completedElapsed = 0;
  for (const p of PHASE_ORDER) {
    if (p === phase || p === "done") break;
    completedWeight += PHASE_WEIGHT[p as keyof typeof PHASE_WEIGHT] ?? 0;
    completedElapsed += timings[p] ?? PHASE_DEFAULT_MS[p as keyof typeof PHASE_DEFAULT_MS] ?? 0;
  }

  const phaseW = PHASE_WEIGHT[phase as keyof typeof PHASE_WEIGHT] ?? 0;
  const phaseElapsed = Math.max(0, now - phaseStart);
  const phaseExpected = PHASE_DEFAULT_MS[phase as keyof typeof PHASE_DEFAULT_MS] ?? 500;
  // Asymptotic — never reaches 100% within a phase until it actually completes.
  const phaseFrac = 1 - Math.exp(-phaseElapsed / phaseExpected);
  const cappedFrac = Math.min(0.95, phaseFrac);

  const pct = Math.min(99, (completedWeight + phaseW * cappedFrac) * 100);

  // ETA: extrapolate from observed throughput when we have data, else defaults.
  let etaMs: number;
  if (completedWeight > 0 && completedElapsed > 0) {
    const msPerWeight = completedElapsed / completedWeight;
    const remainingWeight = 1 - completedWeight - phaseW * cappedFrac;
    etaMs = Math.max(0, remainingWeight * msPerWeight + (phaseExpected - phaseElapsed));
  } else {
    let remaining = Math.max(0, phaseExpected - phaseElapsed);
    let started = false;
    for (const p of PHASE_ORDER) {
      if (p === "done") break;
      if (p === phase) { started = true; continue; }
      if (started) remaining += PHASE_DEFAULT_MS[p as keyof typeof PHASE_DEFAULT_MS] ?? 0;
    }
    etaMs = remaining;
  }
  return { pct, etaMs };
}

function formatEta(ms: number) {
  if (ms <= 0) return "—";
  if (ms < 950) return "<1s";
  return `~${Math.round(ms / 1000)}s`;
}

export const Route = createFileRoute("/diff")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    a: typeof s.a === "string" ? s.a : undefined,
    b: typeof s.b === "string" ? s.b : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Diff — H4CK3D" },
      { name: "description", content: "Compare two build versions side by side." },
    ],
  }),
  component: DiffRoute,
});

type Mode = "code" | "visual" | "overlay";

function DiffRoute() {
  const { a, b } = Route.useSearch();
  const [bA, setBA] = React.useState<CloudBuild | null>(null);
  const [bB, setBB] = React.useState<CloudBuild | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mode, setMode] = React.useState<Mode>("code");
  const [overlay, setOverlay] = React.useState(50);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [slow, setSlow] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [phaseStart, setPhaseStart] = React.useState(0);
  const [now, setNow] = React.useState(0);
  const timingsRef = React.useRef<PhaseTimings>({});

  React.useEffect(() => {
    if (!a || !b) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const start = performance.now();
    setPhaseStart(start);
    setNow(start);
    timingsRef.current = {};
    const tick = setInterval(() => {
      if (!cancelled) {
        const t = performance.now();
        setElapsed(t - start);
        setNow(t);
      }
    }, 100);
    const slowT = setTimeout(() => !cancelled && setSlow(true), 3500);

    const enter = (p: Phase) => {
      const t = performance.now();
      setPhase((prev) => {
        if (prev !== "idle" && prev !== "error" && prev !== "done") {
          timingsRef.current[prev] = t - (timingsRef.current.__start ?? t);
        }
        return p;
      });
      timingsRef.current.__start = t as unknown as number; // sentinel for next phase
      setPhaseStart(t);
      setNow(t);
    };

    (async () => {
      try {
        enter("fetch-a");
        const x = await getBuildById(a);
        if (cancelled) return;
        setBA(x);
        enter("fetch-b");
        const y = await getBuildById(b);
        if (cancelled) return;
        setBB(y);
        enter("diffing");
        await new Promise((r) => setTimeout(r, 0));
        if (cancelled) return;
        enter("rendering");
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        if (cancelled) return;
        enter("done");
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        toast.error(e instanceof Error ? e.message : "Failed to load builds");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(slowT);
      clearInterval(tick);
    };
  }, [a, b]);

  const diff = React.useMemo(
    () => (bA && bB ? computeLineDiff(bA.html, bB.html) : []),
    [bA, bB],
  );

  return (
    <div
      className="relative bg-background text-foreground overflow-hidden"
      style={{ height: "100dvh", width: "100vw" }}
    >
      <Toaster theme="dark" position="top-center" />
      <div
        className="relative mx-auto grid w-full max-w-[640px] h-full min-h-0"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          gridTemplateRows: "auto auto 1fr",
        }}
      >
        <header className="flex items-center gap-2 px-3 py-2 hairline-bottom">
          <Link
            to="/"
            onClick={() => tap()}
            aria-label="Back"
            className="size-9 grid place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Diff · A → B
          </span>
        </header>
        <div className="flex items-center gap-1 px-3 py-2 hairline-bottom">
          <ModeBtn active={mode === "code"} onClick={() => setMode("code")} icon={Code2} label="Code" />
          <ModeBtn active={mode === "visual"} onClick={() => setMode("visual")} icon={Eye} label="Visual" />
          <ModeBtn active={mode === "overlay"} onClick={() => setMode("overlay")} icon={Layers} label="Overlay" />
        </div>

        <main className="relative min-h-0 overflow-hidden">
          {loading && (
            <DiffSkeleton
              mode={mode}
              phase={phase}
              elapsed={elapsed}
              slow={slow}
              phaseStart={phaseStart}
              now={now}
              timings={timingsRef.current}
            />
          )}
          {!loading && (!bA || !bB) && (
            <div className="grid place-items-center h-full">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                ▒ select two builds first ▒
              </p>
            </div>
          )}
          {!loading && bA && bB && mode === "code" && <CodeDiffView lines={diff} />}
          {!loading && bA && bB && mode === "visual" && <VisualDiffView a={bA.html} b={bB.html} />}
          {!loading && bA && bB && mode === "overlay" && (
            <OverlayView a={bA.html} b={bB.html} value={overlay} onChange={setOverlay} />
          )}
        </main>
      </div>
    </div>
  );
}

function ModeBtn({
  active, onClick, icon: Icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest"
      style={{
        color: active ? "var(--amber)" : "var(--muted-foreground)",
        borderBottom: active ? "2px solid var(--amber)" : "2px solid transparent",
      }}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function DiffSkeleton({
  mode,
  phase,
  elapsed,
  slow,
  phaseStart,
  now,
  timings,
}: {
  mode: Mode;
  phase: Phase;
  elapsed: number;
  slow: boolean;
  phaseStart: number;
  now: number;
  timings: PhaseTimings;
}) {
  const currentIdx = Math.max(0, PHASE_ORDER.indexOf(phase));
  const isError = phase === "error";
  const { pct, etaMs } = computeProgress(phase, phaseStart, now, timings);
  return (
    <div className="h-full w-full p-3" aria-busy="true" aria-live="polite">
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-[10px] uppercase tracking-widest inline-flex items-center gap-2"
               style={{ color: isError ? "var(--destructive, #ef4444)" : "var(--amber)" }}>
            {!isError && phase !== "done" && <Loader2 className="size-3 animate-spin" />}
            {PHASE_LABELS[phase]}
          </div>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground inline-flex items-center gap-2">
            <span className="text-phosphor">{Math.floor(pct)}%</span>
            <span aria-hidden>·</span>
            <span>{(elapsed / 1000).toFixed(1)}s</span>
            <span aria-hidden>·</span>
            <span>ETA {formatEta(etaMs)}</span>
          </span>
        </div>
        {/* Continuous progress bar */}
        <div
          className="h-[3px] w-full overflow-hidden rounded-full"
          style={{ background: "color-mix(in oklab, var(--foreground) 8%, transparent)" }}
        >
          <div
            className="h-full transition-[width] duration-200 ease-out"
            style={{
              width: `${pct}%`,
              background: isError
                ? "var(--destructive, #ef4444)"
                : "linear-gradient(90deg, var(--amber), var(--phosphor))",
              boxShadow: "0 0 8px -1px var(--phosphor)",
            }}
          />
        </div>
        {/* Phase pips */}
        <div className="flex items-center gap-1">
          {PHASE_ORDER.map((p, i) => {
            const reached = i <= currentIdx;
            const active = i === currentIdx && !isError && phase !== "done";
            return (
              <div
                key={p}
                className="h-[2px] flex-1 rounded-full transition-colors"
                style={{
                  background: reached
                    ? isError
                      ? "var(--destructive, #ef4444)"
                      : "var(--phosphor)"
                    : "color-mix(in oklab, var(--foreground) 12%, transparent)",
                  boxShadow: active ? "0 0 6px var(--phosphor)" : "none",
                }}
              />
            );
          })}
        </div>
        {slow && (
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            ▒ still working… large builds may take a moment ▒
          </div>
        )}
      </div>
      <PhaseAwareSkeleton mode={mode} phase={phase} />
    </div>
  );
}

/**
 * Skeleton body that mirrors the *current loading phase* per mode:
 * - fetch-a:   only A side is "loading" (B remains an empty placeholder)
 * - fetch-b:   A side appears "ready" (subtle solid), B side still shimmering
 * - diffing:   both sides ready, code lines stream in (alternating add/del tones)
 * - rendering: faint scanline reveal animation across the whole pane
 */
function PhaseAwareSkeleton({ mode, phase }: { mode: Mode; phase: Phase }) {
  const isFetchingA = phase === "fetch-a";
  const isFetchingB = phase === "fetch-b";
  const isDiffing = phase === "diffing";
  const isRendering = phase === "rendering";

  if (mode === "code") {
    // Show diff-style placeholder lines; tint them once we hit "diffing".
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 16 }).map((_, i) => {
          const tint = isDiffing || isRendering
            ? i % 5 === 0
              ? "color-mix(in oklab, var(--phosphor) 10%, transparent)"
              : i % 7 === 0
                ? "color-mix(in oklab, var(--amber) 10%, transparent)"
                : "color-mix(in oklab, var(--foreground) 5%, transparent)"
            : "color-mix(in oklab, var(--foreground) 5%, transparent)";
          const showSign = isDiffing || isRendering;
          const sign = i % 5 === 0 ? "+" : i % 7 === 0 ? "-" : " ";
          const signColor = sign === "+"
            ? "var(--phosphor)"
            : sign === "-"
              ? "var(--amber)"
              : "var(--muted-foreground)";
          const animate =
            (isFetchingA && i < 8) ||
            (isFetchingB && i >= 8) ||
            isDiffing ||
            isRendering;
          return (
            <div key={i} className="flex items-center gap-2">
              {showSign && (
                <span
                  className="font-mono text-[11px] w-3 text-center opacity-70"
                  style={{ color: signColor }}
                >
                  {sign}
                </span>
              )}
              <div
                className={`h-3 rounded-[3px] flex-1 ${animate ? "animate-pulse" : ""}`}
                style={{
                  background: tint,
                  width: `${40 + ((i * 13) % 55)}%`,
                  maxWidth: `${40 + ((i * 13) % 55)}%`,
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (mode === "visual") {
    return (
      <div className="grid grid-rows-2 gap-2 h-[calc(100%-3.5rem)]">
        <SkeletonPane label="A" loading={isFetchingA} ready={!isFetchingA} rendering={isRendering} />
        <SkeletonPane label="B" loading={isFetchingB || isFetchingA} ready={!isFetchingA && !isFetchingB} rendering={isRendering} />
      </div>
    );
  }

  // overlay
  return (
    <div className="relative rounded-[5px] overflow-hidden h-[calc(100%-3.5rem)] bg-foreground/5">
      <div
        className={`absolute inset-0 ${isFetchingA || isFetchingB ? "animate-pulse" : ""}`}
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--amber) 8%, transparent), color-mix(in oklab, var(--phosphor) 8%, transparent))",
        }}
      />
      {isRendering && <ScanlineSweep />}
      <div className="absolute bottom-3 left-3 right-3 hairline rounded-[5px] bg-background/60 backdrop-blur-xl px-3 py-2 flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">A</span>
        <div className="h-1.5 flex-1 rounded-full bg-foreground/10 overflow-hidden">
          <div className="h-full w-1/2 bg-amber/60" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-phosphor">B</span>
      </div>
    </div>
  );
}

function SkeletonPane({
  label, loading, ready, rendering,
}: { label: string; loading: boolean; ready: boolean; rendering: boolean }) {
  return (
    <div className="relative rounded-[5px] overflow-hidden bg-foreground/5">
      <span className="absolute top-1 left-2 z-10 font-mono text-[10px] uppercase tracking-widest text-amber bg-black/70 px-1 rounded-[2px]">
        {label}
      </span>
      <div
        className={`absolute inset-0 ${loading ? "animate-pulse" : ""}`}
        style={{
          background: ready
            ? "color-mix(in oklab, var(--phosphor) 6%, transparent)"
            : "color-mix(in oklab, var(--foreground) 6%, transparent)",
        }}
      />
      {rendering && <ScanlineSweep />}
      {ready && !rendering && (
        <div className="absolute top-1 right-2 font-mono text-[9px] uppercase tracking-widest text-phosphor">
          ✓ ready
        </div>
      )}
    </div>
  );
}

function ScanlineSweep() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute left-0 right-0 h-8"
        style={{
          background:
            "linear-gradient(180deg, transparent, color-mix(in oklab, var(--phosphor) 25%, transparent), transparent)",
          animation: "diff-scan 1.4s linear infinite",
        }}
      />
      <style>{`@keyframes diff-scan { 0% { top: -10%; } 100% { top: 110%; } }`}</style>
    </div>
  );
}

function CodeDiffView({ lines }: { lines: { kind: "add" | "del" | "ctx"; text: string }[] }) {
  return (
    <pre className="h-full overflow-auto bg-black px-3 py-3 font-mono text-[11px] leading-snug">
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            color:
              l.kind === "add"
                ? "var(--phosphor)"
                : l.kind === "del"
                ? "var(--amber)"
                : "var(--muted-foreground)",
            background:
              l.kind === "add"
                ? "color-mix(in oklab, var(--phosphor) 8%, transparent)"
                : l.kind === "del"
                ? "color-mix(in oklab, var(--amber) 8%, transparent)"
                : "transparent",
          }}
        >
          <span className="opacity-60 mr-2">
            {l.kind === "add" ? "+" : l.kind === "del" ? "-" : " "}
          </span>
          {l.text || "\u00A0"}
        </div>
      ))}
    </pre>
  );
}

function VisualDiffView({ a, b }: { a: string; b: string }) {
  return (
    <div className="grid h-full grid-rows-2 gap-px bg-border">
      <Pane label="A" html={a} />
      <Pane label="B" html={b} />
    </div>
  );
}

function Pane({ label, html }: { label: string; html: string }) {
  return (
    <div className="relative bg-black">
      <span className="absolute top-1 left-2 z-10 font-mono text-[10px] uppercase tracking-widest text-amber bg-black/70 px-1 rounded-[2px]">
        {label}
      </span>
      <iframe srcDoc={html} sandbox="allow-scripts" className="w-full h-full border-0" title={label} />
    </div>
  );
}

function OverlayView({
  a, b, value, onChange,
}: { a: string; b: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="relative h-full w-full bg-black">
      <iframe srcDoc={a} sandbox="allow-scripts" className="absolute inset-0 w-full h-full border-0" title="A" />
      <iframe
        srcDoc={b}
        sandbox="allow-scripts"
        className="absolute inset-0 w-full h-full border-0"
        style={{ opacity: value / 100 }}
        title="B"
      />
      <div className="absolute bottom-3 left-3 right-3 hairline rounded-[5px] bg-background/90 backdrop-blur-xl px-3 py-2 flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">A</span>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-amber"
        />
        <span className="font-mono text-[10px] uppercase tracking-widest text-phosphor">B {value}%</span>
      </div>
    </div>
  );
}