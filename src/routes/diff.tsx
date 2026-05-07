import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Code2, Eye, Layers, Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { getBuildById, type CloudBuild } from "@/lib/builds.cloud";
import { computeLineDiff } from "@/lib/diff";
import { tap } from "@/hooks/useHaptic";

type Search = { a?: string; b?: string };

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
  const [status, setStatus] = React.useState("Loading builds…");

  React.useEffect(() => {
    if (!a || !b) {
      setLoading(false);
      return;
    }
    setStatus("Fetching build A & B…");
    const slow = setTimeout(
      () => setStatus("Still loading… large builds may take a moment"),
      3500,
    );
    Promise.all([getBuildById(a), getBuildById(b)])
      .then(([x, y]) => {
        setBA(x);
        setBB(y);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load builds"))
      .finally(() => {
        clearTimeout(slow);
        setLoading(false);
      });
    return () => clearTimeout(slow);
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
          {loading && <DiffSkeleton mode={mode} status={status} />}
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

function DiffSkeleton({ mode, status }: { mode: Mode; status: string }) {
  return (
    <div className="h-full w-full p-3" aria-busy="true" aria-live="polite">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3 inline-flex items-center gap-2">
        <Loader2 className="size-3 animate-spin" /> {status}
      </div>
      {mode === "code" && (
        <div className="space-y-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded-[3px] bg-foreground/5 animate-pulse"
              style={{ width: `${40 + ((i * 13) % 55)}%` }}
            />
          ))}
        </div>
      )}
      {mode === "visual" && (
        <div className="grid grid-rows-2 gap-2 h-[calc(100%-2rem)]">
          <div className="rounded-[5px] bg-foreground/5 animate-pulse" />
          <div className="rounded-[5px] bg-foreground/5 animate-pulse" />
        </div>
      )}
      {mode === "overlay" && (
        <div className="rounded-[5px] bg-foreground/5 animate-pulse h-[calc(100%-2rem)]" />
      )}
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