import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, Bell, Plus, Mic, ArrowUp, RefreshCw, ChevronDown,
  Home, Grid3x3, BookText, Settings, Search, BarChart3,
  Hammer, Workflow, Sparkles,
} from "lucide-react";
import { Parallax, Magnetic } from "@/components/phosphor/Parallax";
import { CountUp } from "@/components/phosphor/CountUp";
import { Sparkline, ProgressRing } from "@/components/phosphor/Sparkline";
import { useRotatingPlaceholder } from "@/hooks/useRotatingPlaceholder";
import { tap } from "@/hooks/useHaptic";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "H4CK3D — Phosphor Noir" },
      { name: "description", content: "Mobile-first AI agent builder. AMOLED black, amber CRT, phosphor green LED." },
    ],
  }),
  component: PhosphorHome,
});

/* ──────────────────────────────────────────────────────────── */

type Mode = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const MODES: Mode[] = [
  { id: "ask",      label: "Ask",      icon: Sparkles },
  { id: "research", label: "Research", icon: Search },
  { id: "analyze",  label: "Analyze",  icon: BarChart3 },
  { id: "build",    label: "Build",    icon: Hammer },
  { id: "automate", label: "Automate", icon: Workflow, badge: "NEW" },
];

const SUGGESTIONS_BY_MODE: Record<string, string[]> = {
  ask:      ["Explain quantum tunnelling", "Summarize my notes", "Draft a polite email"],
  research: ["Compare top 3 EV brands", "Find sources on solid-state batteries", "Survey AI agent frameworks"],
  analyze:  ["Analyze Q4 sales", "Spot trends in CSV", "Cohort retention chart"],
  build:    ["SaaS landing page", "Pricing table dark mode", "Glassmorphism dashboard"],
  automate: ["Daily news digest", "Slack standup bot", "Inbox triage rules"],
};

const PROMPT_PLACEHOLDERS = [
  "Build a SaaS landing page…",
  "Generate a pricing table…",
  "Design a glass dashboard…",
  "Make a portfolio for a designer…",
];

const KPIS = [
  { label: "Tasks completed", value: 1284, delta: "+12%", spark: [4,6,5,8,7,10,9,12,14,13,15,18] },
  { label: "Hours saved",     value: 96.4, decimals: 1, suffix: "h", delta: "+4.2h", spark: [2,3,3,4,5,5,6,7,8,8,9,10] },
  { label: "Success rate",    value: 98.2, decimals: 1, suffix: "%", delta: "+0.8%", spark: [90,92,93,94,95,95,96,97,97,98,98,98] },
  { label: "Connected apps",  value: 14,   delta: "+2",  spark: [6,7,8,8,9,10,11,11,12,13,13,14] },
];

const AGENTS = [
  { name: "Researcher", desc: "Gathers sources & synthesizes",  progress: 84, color: "var(--phosphor)" },
  { name: "Analyst",    desc: "Crunches data, surfaces signal", progress: 62, color: "var(--phosphor)" },
  { name: "Planner",    desc: "Breaks goals into next actions", progress: 48, color: "var(--amber)" },
  { name: "Writer",     desc: "Drafts and edits long-form copy",progress: 91, color: "var(--phosphor)" },
];

/* ──────────────────────────────────────────────────────────── */

function PhosphorHome() {
  const [mode, setMode] = React.useState<(typeof MODES)[number]["id"]>("research");
  const [prompt, setPrompt] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [amp, setAmp] = React.useState(0);
  const navigate = useNavigate();

  const submitPrompt = React.useCallback((q: string) => {
    const text = q.trim();
    if (!text) return;
    tap(10);
    setPrompt("");
    navigate({ to: "/build", search: { q: text } });
  }, [navigate]);

  // Mic with real Web Audio amplitude
  const audioRef = React.useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        setAmp(Math.min(1, Math.sqrt(sum / data.length) * 3));
        const raf = requestAnimationFrame(tick);
        if (audioRef.current) audioRef.current.raf = raf;
      };
      tick();
      audioRef.current = { ctx, stream, raf: 0 };
      setRecording(true);
    } catch {
      // permission denied — silently degrade
    }
  };
  const stopMic = () => {
    if (audioRef.current) {
      cancelAnimationFrame(audioRef.current.raf);
      audioRef.current.stream.getTracks().forEach((t) => t.stop());
      audioRef.current.ctx.close();
      audioRef.current = null;
    }
    setRecording(false);
    setAmp(0);
  };

  return (
    <div
      className="relative bg-background text-foreground overflow-hidden"
      style={{ height: "100dvh", width: "100vw" }}
    >
      {/* Subtle CRT grid backdrop */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      <div
        className="relative mx-auto grid w-full max-w-[480px] h-full min-h-0"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingLeft: "max(env(safe-area-inset-left), clamp(12px, 4vw, 20px))",
          paddingRight: "max(env(safe-area-inset-right), clamp(12px, 4vw, 20px))",
          gridTemplateRows:
            "auto auto auto auto auto minmax(120px, 0.9fr) minmax(140px, 1fr) auto",
          rowGap: "clamp(8px, 1.6vh, 16px)",
          paddingBottom: 0,
        }}
      >
        <TopBar />
        <ModeTabs mode={mode} setMode={setMode} />
        <Hero />
        <Composer
          prompt={prompt}
          setPrompt={setPrompt}
          recording={recording}
          amp={amp}
          onMicDown={startMic}
          onMicUp={stopMic}
          mode={mode}
          onSend={() => submitPrompt(prompt)}
        />
        <Suggestions mode={mode} onPick={(s) => submitPrompt(s)} />
        <KpiGrid />
        <AgentList onPick={(starter) => submitPrompt(starter)} />
        <BottomNav onNew={() => navigate({ to: "/build", search: {} })} />
      </div>
    </div>
  );
}

/* ──────────────── Top bar ──────────────── */
function TopBar() {
  return (
    <header className="flex items-center justify-between min-h-0 pt-1">
      <button aria-label="Menu" className="rounded-[5px] p-2 hover:bg-surface transition-colors">
        <Menu className="size-5 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2">
        <span className="font-display text-2xl font-medium leading-none text-amber" style={{ textShadow: "0 0 12px color-mix(in oklab, var(--amber) 40%, transparent)" }}>
          H
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">4CK3D</span>
      </div>

      <div className="flex items-center gap-2">
        <button aria-label="Notifications" className="relative rounded-[5px] p-2 hover:bg-surface transition-colors">
          <Bell className="size-5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-phosphor animate-phosphor" />
        </button>
        <div className="size-8 rounded-full p-[1px]" style={{ background: "var(--amber)" }}>
          <div className="grid h-full w-full place-items-center rounded-full bg-background font-mono text-[11px]">A</div>
        </div>
      </div>
    </header>
  );
}

/* ──────────────── Mode tabs ──────────────── */
function ModeTabs({ mode, setMode }: { mode: string; setMode: (m: any) => void }) {
  return (
    <nav className="hairline-bottom -mx-5 px-3 min-h-0">
      <ul className="flex justify-between gap-1 pb-2">
        {MODES.map((m) => {
          const active = m.id === mode;
          return (
            <li key={m.id} className="relative">
              <button
                onClick={() => setMode(m.id)}
                className="flex items-center gap-1 py-1 font-mono uppercase tracking-[0.14em] transition-colors whitespace-nowrap"
                style={{ color: active ? "var(--amber)" : "var(--muted-foreground)" }}
              >
                <m.icon className="size-3 hidden min-[380px]:inline-block" />
                <span style={{ fontSize: "clamp(9px, 2.4vw, 11px)" }}>{m.label}</span>
                {m.badge && (
                  <span className="ml-1 size-1.5 rounded-full bg-phosphor animate-phosphor" aria-label={m.badge} />
                )}
              </button>
              {active && (
                <motion.span
                  layoutId="mode-underline"
                  className="absolute -bottom-3 left-0 right-0 h-[2px] bg-amber"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ──────────────── Hero ──────────────── */
function Hero() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-0"
    >
    <Parallax intensity={5} className="min-h-0">
      <p className="font-mono uppercase tracking-[0.22em] text-muted-foreground" style={{ fontSize: "clamp(10px, 2.6vw, 11px)" }}>
        {greet}, Alex
      </p>
      <h1
        className="font-display mt-1 font-medium text-foreground line-clamp-2"
        style={{ fontSize: "clamp(22px, 6.4vw, 34px)", lineHeight: 1 }}
      >
        How can I help you{" "}
        <span className="text-amber" style={{ textShadow: "0 0 24px color-mix(in oklab, var(--amber) 35%, transparent)" }}>today?</span>
      </h1>
    </Parallax>
    </motion.div>
  );
}

/* ──────────────── Composer ──────────────── */
function Composer({
  prompt, setPrompt, recording, amp, onMicDown, onMicUp, mode, onSend,
}: {
  prompt: string;
  setPrompt: (s: string) => void;
  recording: boolean;
  amp: number;
  onMicDown: () => void;
  onMicUp: () => void;
  mode: string;
  onSend: () => void;
}) {
  const [focus, setFocus] = React.useState(false);
  const placeholder = useRotatingPlaceholder(PROMPT_PLACEHOLDERS, 3000);
  return (
    <div
      className="rounded-[5px] bg-surface transition-all min-h-0"
      style={{
        border: `1px solid ${focus ? "var(--amber)" : "var(--border)"}`,
        boxShadow: focus ? "inset 0 0 0 1px color-mix(in oklab, var(--amber) 25%, transparent), 0 0 32px -12px var(--amber)" : "none",
      }}
    >
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={2}
          className="block w-full resize-none rounded-t-[5px] bg-transparent px-4 pt-3 pb-1 font-mono leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ fontSize: "16px" }}
        />
        {!prompt && focus && (
          <span className="pointer-events-none absolute left-4 top-4 inline-block h-4 w-[2px] translate-x-px bg-amber animate-caret" />
        )}
      </div>

      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        <IconBtn aria-label="Attach"><Plus className="size-4" /></IconBtn>
        <Chip>Pro <ChevronDown className="size-3" /></Chip>
        <Chip>{mode[0].toUpperCase() + mode.slice(1)} <ChevronDown className="size-3" /></Chip>

        <div className="ml-auto flex items-center gap-2">
          {/* Mic — phosphor breathing, scales with real amplitude */}
          <button
            aria-label="Hold to record"
            onPointerDown={onMicDown}
            onPointerUp={onMicUp}
            onPointerCancel={recording ? onMicUp : undefined}
            className="relative grid size-9 place-items-center rounded-full hairline transition-colors"
            style={{
              borderColor: recording ? "var(--phosphor)" : "var(--border)",
              boxShadow: recording
                ? `0 0 ${12 + amp * 30}px color-mix(in oklab, var(--phosphor) ${30 + amp * 50}%, transparent)`
                : "none",
            }}
          >
            <Mic className="size-4" style={{ color: recording ? "var(--phosphor)" : "var(--muted-foreground)" }} />
            {recording && (
              <span
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  border: "1px solid var(--phosphor)",
                  transform: `scale(${1 + amp * 0.6})`,
                  opacity: 0.4 + amp * 0.6,
                  transition: "transform 60ms linear, opacity 60ms linear",
                }}
              />
            )}
          </button>

          {/* Send — magnetic amber */}
          <Magnetic strength={0.4}>
            <button
              aria-label="Send"
              onClick={onSend}
              disabled={!prompt.trim()}
              className="grid size-9 place-items-center rounded-[5px] bg-amber text-black transition-opacity disabled:opacity-30"
              style={{ boxShadow: prompt.trim() ? "0 0 24px -6px var(--amber)" : "none" }}
            >
              <ArrowUp className="size-4" />
            </button>
          </Magnetic>
        </div>
      </div>
    </div>
  );
}

function IconBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="grid size-8 place-items-center rounded-[5px] hairline text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30"
    />
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex items-center gap-1 rounded-[5px] hairline px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
      {children}
    </button>
  );
}

/* ──────────────── Suggestions ──────────────── */
function Suggestions({ mode, onPick }: { mode: string; onPick: (s: string) => void }) {
  const [seed, setSeed] = React.useState(0);
  const items = React.useMemo(() => {
    const list = SUGGESTIONS_BY_MODE[mode] ?? SUGGESTIONS_BY_MODE.build;
    // light shuffle by seed
    return [...list].sort(() => (seed * 9301 + 49297) % 2 - 0.5);
  }, [mode, seed]);
  return (
    <div className="flex flex-wrap items-center gap-2 min-h-0">
      {items.slice(0, 2).map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="truncate max-w-[60%] rounded-[5px] hairline bg-surface px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30"
        >
          {s.length > 22 ? s.slice(0, 22) + "…" : s}
        </button>
      ))}
      <button
        aria-label="Refresh suggestions"
        onClick={() => setSeed((n) => n + 1)}
        className="ml-auto grid size-7 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:text-amber"
      >
        <RefreshCw className="size-3.5" />
      </button>
    </div>
  );
}

/* ──────────────── KPI grid ──────────────── */
function KpiGrid() {
  return (
    <section className="min-h-0 flex flex-col overflow-hidden">
      <SectionLabel>Performance · last 30d</SectionLabel>
      <div className="mt-2 grid grid-cols-2 grid-rows-2 gap-2 flex-1 min-h-0">
        {KPIS.map((k) => (
          <Parallax key={k.label} intensity={3} className="min-h-0 min-w-0">
            <div className="rounded-[5px] hairline bg-surface h-full flex flex-col justify-between overflow-hidden min-w-0" style={{ padding: "clamp(8px, 2vw, 12px)" }}>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate shrink-0">
                {k.label}
              </div>
              <div className="font-mono font-medium leading-none text-foreground tabular-nums truncate" style={{ fontSize: "clamp(18px, 5.4vw, 26px)" }}>
                <CountUp to={k.value} decimals={k.decimals ?? 0} suffix={k.suffix ?? ""} />
              </div>
              <div className="flex items-end justify-between gap-1 shrink-0 min-w-0">
                <span className="font-mono text-[9px] text-amber truncate">{k.delta}</span>
                <div className="overflow-hidden shrink-0">
                  <Sparkline data={k.spark} width={48} height={14} />
                </div>
              </div>
            </div>
          </Parallax>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── Agents ──────────────── */
function AgentList() {
  return (
    <section className="min-h-0 flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <SectionLabel>Your agents</SectionLabel>
        <button className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-amber">
          View all →
        </button>
      </div>
      <ul
        className="mt-2 divide-y divide-[color:var(--border)] hairline rounded-[5px] bg-surface overflow-y-auto no-scrollbar scroll-fade flex-1 min-h-0"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >
        {AGENTS.map((a) => (
          <li key={a.name}>
            <button className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2">
              <div className="grid size-9 place-items-center rounded-[5px] hairline bg-background shrink-0">
                <span className="font-display text-[15px] text-amber">{a.name[0]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[14px] text-foreground leading-tight">{a.name}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{a.desc}</div>
              </div>
              <div className="relative grid size-9 place-items-center shrink-0">
                <ProgressRing value={a.progress} color={a.color} />
                <span className="absolute font-mono text-[9px] text-muted-foreground">{a.progress}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </h2>
  );
}

/* ──────────────── Bottom nav ──────────────── */
function BottomNav() {
  const [active, setActive] = React.useState("home");
  const items = [
    { id: "home", icon: Home, label: "Home" },
    { id: "grid", icon: Grid3x3, label: "Agents" },
    { id: "new",  icon: Plus,  label: "New", primary: true },
    { id: "docs", icon: BookText, label: "Docs" },
    { id: "set",  icon: Settings, label: "Settings" },
  ];
  return (
    <nav className="-mx-5 min-h-0">
      <div className="hairline-top bg-background/85 px-2 pt-2 backdrop-blur-xl" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
        <ul className="grid grid-cols-5 place-items-center">
          {items.map((it) => {
            if (it.primary) {
              return (
                <li key={it.id}>
                  <Magnetic strength={0.5}>
                    <button
                      aria-label={it.label}
                      className="grid size-10 place-items-center rounded-[5px] bg-amber text-black"
                      style={{ boxShadow: "0 0 18px -6px var(--amber)" }}
                    >
                      <it.icon className="size-4" />
                    </button>
                  </Magnetic>
                </li>
              );
            }
            const isActive = active === it.id;
            return (
              <li key={it.id}>
                <button
                  onClick={() => setActive(it.id)}
                  aria-label={it.label}
                  className="flex flex-col items-center gap-1 px-2 py-1"
                  style={{ color: isActive ? "var(--amber)" : "var(--muted-foreground)" }}
                >
                  <it.icon className="size-[18px]" />
                  <span className="font-mono text-[9px] uppercase tracking-widest">{it.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
