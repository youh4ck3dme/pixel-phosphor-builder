import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, RotateCw, Copy, ArrowUp, Code2, Eye, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PreviewFrame } from "@/components/phosphor/PreviewFrame";
import { CodePane } from "@/components/phosphor/CodePane";
import { StreamProgress, type StreamPhase } from "@/components/phosphor/StreamProgress";
import { saveBuild, newId, getBuild, getModel, setModel, type Build } from "@/lib/storage";
import { tap } from "@/hooks/useHaptic";
import { supabase } from "@/integrations/supabase/client";
import { saveCloudBuild, getBuildById } from "@/lib/builds.cloud";

type Search = { q?: string; id?: string };

export const Route = createFileRoute("/build")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Build — H4CK3D" },
      { name: "description", content: "Generate live HTML previews from natural-language prompts." },
    ],
  }),
  component: BuildRoute,
});

function BuildRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [tab, setTab] = React.useState<"preview" | "code">("preview");
  const [code, setCode] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [phase, setPhase] = React.useState<StreamPhase>("idle");
  const [bytes, setBytes] = React.useState(0);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const startTimeRef = React.useRef<number>(0);
  const [prompt, setPrompt] = React.useState("");
  const [model, setModelState] = React.useState<"flash" | "pro">("flash");
  const [buildId, setBuildId] = React.useState<string>(() => search.id ?? newId());
  const [title, setTitle] = React.useState("Untitled build");
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [parentBuildId, setParentBuildId] = React.useState<string | null>(null);
  const [authed, setAuthed] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const startedRef = React.useRef(false);

  // Tick elapsed time while streaming
  React.useEffect(() => {
    if (phase === "idle" || phase === "done" || phase === "error") return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
    return () => window.clearInterval(id);
  }, [phase]);

  React.useEffect(() => {
    setModelState(getModel());
  }, []);

  // Track auth
  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Hydrate from cloud or localStorage if id given
  React.useEffect(() => {
    if (!search.id) return;
    let cancelled = false;
    (async () => {
      // Try cloud first (UUID-shaped) — fall back to localStorage
      try {
        const b = await getBuildById(search.id!);
        if (!cancelled && b) {
          setCode(b.html);
          setTitle(b.prompt.slice(0, 40) || "Untitled build");
          setProjectId(b.project_id);
          setParentBuildId(b.id);
          return;
        }
      } catch {
        /* ignore */
      }
      const local = getBuild(search.id!);
      if (!cancelled && local) {
        setCode(local.html);
        setTitle(local.prompt.slice(0, 40) || "Untitled build");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search.id]);

  // Auto-run if ?q= passed and we haven't started yet
  React.useEffect(() => {
    if (startedRef.current) return;
    if (search.q && !search.id) {
      startedRef.current = true;
      void run(search.q, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q]);

  async function run(userPrompt: string, prevHtml: string) {
    if (!userPrompt.trim()) return;
    setStreaming(true);
    setPhase("requesting");
    setBytes(0);
    setElapsedMs(0);
    startTimeRef.current = Date.now();
    setCode("");
    setTitle(userPrompt.slice(0, 40));
    setTab("code");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, prevHtml: prevHtml || undefined, model }),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        let msg = `Request failed (${resp.status})`;
        try {
          const j = await resp.json();
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
        toast.error(msg);
        setPhase("error");
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // Switch to preview after a small head start so user sees rendering happen
      let switched = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setCode(acc);
        setBytes(acc.length);
        setPhase((p) => (p === "requesting" ? "streaming" : p));
        if (!switched && acc.length > 400) {
          switched = true;
          setTab("preview");
          setPhase("rendering");
        }
      }
      // strip stray markdown fences if model misbehaved
      const cleaned = acc.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim();
      setCode(cleaned);
      setBytes(cleaned.length);

      // Persist: cloud if authed, otherwise localStorage
      let savedId = buildId;
      if (authed) {
        try {
          const { project, build } = await saveCloudBuild({
            projectId,
            prompt: userPrompt,
            html: cleaned,
            model,
            parentBuildId,
          });
          setProjectId(project.id);
          setParentBuildId(build.id);
          savedId = build.id;
        } catch (err) {
          // Fall back to local
          const localBuild: Build = {
            id: buildId,
            prompt: userPrompt,
            html: cleaned,
            model,
            createdAt: Date.now(),
          };
          saveBuild(localBuild);
          toast.error("Saved locally only — cloud sync failed");
        }
      } else {
        const localBuild: Build = {
          id: buildId,
          prompt: userPrompt,
          html: cleaned,
          model,
          createdAt: Date.now(),
        };
        saveBuild(localBuild);
      }
      navigate({ to: "/build", search: { id: savedId }, replace: true });
      setElapsedMs(Date.now() - startTimeRef.current);
      setPhase("done");
      toast.success("Build complete");
      tap(12);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error(e?.message ?? "Generation failed");
        setPhase("error");
      } else {
        setPhase("idle");
      }
    } finally {
      setStreaming(false);
    }
  }

  function regenerate() {
    const last = search.q || prompt || title;
    if (!last) return;
    setBuildId(newId());
    void run(last, "");
  }

  function download() {
    if (!code) return;
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "build"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded .html");
    tap();
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied to clipboard");
      tap();
    } catch {
      toast.error("Copy failed");
    }
  }

  function submit() {
    if (!prompt.trim() || streaming) return;
    const p = prompt.trim();
    setPrompt("");
    void run(p, code);
    tap(10);
  }

  function toggleModel() {
    const next = model === "flash" ? "pro" : "flash";
    setModelState(next);
    setModel(next);
    toast.message(`Model: ${next === "flash" ? "Flash" : "Pro"}`);
  }

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
          paddingLeft: "max(env(safe-area-inset-left), 0px)",
          paddingRight: "max(env(safe-area-inset-right), 0px)",
          gridTemplateRows: "auto auto auto 1fr auto",
          rowGap: 0,
        }}
      >
        {/* TopBar */}
        <header className="flex items-center justify-between px-3 py-2 hairline-bottom min-h-0">
          <Link
            to="/"
            aria-label="Back"
            onClick={() => tap()}
            className="grid size-9 place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-center px-3">
            <span className="truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {streaming ? "Generating…" : title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={regenerate}
              disabled={streaming || !title}
              aria-label="Regenerate"
              className="grid size-9 place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber disabled:opacity-40"
            >
              <RotateCw className={`size-4 ${streaming ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={copy}
              disabled={!code}
              aria-label="Copy HTML"
              className="grid size-9 place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber disabled:opacity-40"
            >
              <Copy className="size-4" />
            </button>
            <button
              onClick={download}
              disabled={!code}
              aria-label="Download"
              className="grid size-9 place-items-center rounded-[5px] hairline text-muted-foreground hover:text-amber disabled:opacity-40"
            >
              <Download className="size-4" />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 hairline-bottom min-h-0">
          <TabBtn active={tab === "preview"} onClick={() => setTab("preview")} icon={Eye} label="Preview" />
          <TabBtn active={tab === "code"} onClick={() => setTab("code")} icon={Code2} label="Code" />
          <div className="ml-auto flex items-center gap-2">
            {streaming && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-phosphor">
                <span className="size-1.5 rounded-full bg-phosphor animate-phosphor" />
                stream
              </span>
            )}
            <button
              onClick={toggleModel}
              className="flex items-center gap-1 rounded-[5px] hairline px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-amber"
            >
              {model === "pro" ? "Pro" : "Flash"}
              <ChevronDown className="size-3" />
            </button>
          </div>
        </div>

        {/* Stream progress */}
        <StreamProgress phase={phase} bytes={bytes} elapsedMs={elapsedMs} />

        {/* Stage */}
        <main className="relative min-h-0 overflow-hidden">
          {tab === "preview" ? (
            <PreviewFrame html={code} />
          ) : (
            <CodePane code={code} streaming={streaming} />
          )}
        </main>

        {/* Mini composer */}
        <div
          className="hairline-top bg-background/85 backdrop-blur-xl px-3 pt-2"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <div
            className="flex items-center gap-2 rounded-[5px] bg-surface hairline px-2 py-1.5"
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={code ? "Iterate: add pricing, dark mode…" : "Describe what to build…"}
              className="flex-1 bg-transparent px-2 py-1 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{ fontSize: "16px" }}
            />
            <button
              onClick={submit}
              disabled={!prompt.trim() || streaming}
              aria-label="Send"
              className="grid size-9 place-items-center rounded-[5px] bg-amber text-black transition-opacity disabled:opacity-30"
              style={{ boxShadow: prompt.trim() && !streaming ? "0 0 24px -6px var(--amber)" : "none" }}
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
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
      className="flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors"
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