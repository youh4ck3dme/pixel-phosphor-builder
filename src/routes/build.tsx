import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Code2, Eye, Gauge } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PreviewFrame } from "@/components/phosphor/PreviewFrame";
import { CodePane } from "@/components/phosphor/CodePane";
import { StreamProgress, type StreamPhase } from "@/components/phosphor/StreamProgress";
import { StreamTimeline } from "@/components/build/StreamTimeline";
import { ViewportSwitcher, VIEWPORT_WIDTH, type ViewportKey } from "@/components/build/ViewportSwitcher";
import { QualityPanel } from "@/components/build/QualityPanel";
import { StudioHeader } from "@/components/build/StudioHeader";
import { StudioInspector } from "@/components/build/StudioInspector";
import { StudioComposer } from "@/components/build/StudioComposer";
import { StudioCommandPalette } from "@/components/build/StudioCommandPalette";
import { detectMilestones, MILESTONE_ORDER, type Milestone } from "@/lib/html.milestones";
import { auditHtml } from "@/lib/html.quality";
import { exportBuildZip } from "@/lib/export.zip";
import { saveBuild, newId, getBuild, getModel, setModel, type Build } from "@/lib/storage";
import { tap } from "@/hooks/useHaptic";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { supabase } from "@/integrations/supabase/client";
import { saveCloudBuild, getBuildById, renameProject } from "@/lib/builds.cloud";
import { createSnapshot } from "@/lib/snapshots";
import { type PromptPreset } from "@/lib/prompt.presets";

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

type LeftMode = "code" | "stream" | "quality";
type HistoryEntry = { text: string; at: number };

function BuildRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [tab, setTab] = React.useState<"preview" | "code" | "quality">("preview");
  const [leftMode, setLeftMode] = React.useState<LeftMode>("code");
  const [viewport, setViewport] = React.useState<ViewportKey>("mobile");
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
  const [milestones, setMilestones] = React.useState<Set<Milestone>>(new Set());
  const [enhancing, setEnhancing] = React.useState(false);
  const [designerBusy, setDesignerBusy] = React.useState(false);
  const [showSlash, setShowSlash] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(true);
  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [version, setVersion] = React.useState(1);
  const [temperature, setTemperature] = React.useState(0.7);
  const [maxTokens, setMaxTokens] = React.useState(8192);
  const [latencyMs, setLatencyMs] = React.useState<number | null>(null);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

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
  }, [search.q, isDesktop]);

  async function run(userPrompt: string, prevHtml: string) {
    if (!userPrompt.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast.error("Pre generovanie sa prosím prihlás");
      navigate({ to: "/auth" });
      return;
    }
    setStreaming(true);
    setPhase("requesting");
    setBytes(0);
    setElapsedMs(0);
    setLatencyMs(null);
    startTimeRef.current = Date.now();
    setCode("");
    setMilestones(new Set());
    setTitle(userPrompt.slice(0, 40));
    setHistory((h) => [{ text: userPrompt, at: Date.now() }, ...h].slice(0, 20));
    setLeftMode("code");
    setTab("code");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: userPrompt,
          prevHtml: prevHtml || undefined,
          model,
          temperature,
          maxTokens,
        }),
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
      let firstChunk = true;
      // Switch mobile tab to preview after a small head start so user sees rendering happen
      let switched = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstChunk) {
          firstChunk = false;
          setLatencyMs(Date.now() - startTimeRef.current);
        }
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setCode(acc);
        setBytes(acc.length);
        setMilestones(detectMilestones(acc));
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
      setMilestones(detectMilestones(cleaned + "</html>"));

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
        } catch {
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
      setVersion((v) => v + 1);
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

  function stopStream() {
    abortRef.current?.abort();
    setStreaming(false);
    setPhase("idle");
    toast.message("Stopped");
  }

  async function enhancePrompt() {
    if (!prompt.trim() || enhancing) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast.error("Pre generovanie sa prosím prihlás");
      navigate({ to: "/auth" });
      return;
    }
    setEnhancing(true);
    try {
      const resp = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j.error || "Enhance failed");
      setPrompt(j.enhanced);
      toast.success("Prompt enhanced");
      tap();
    } catch (e: any) {
      toast.error(e?.message ?? "Enhance failed");
    } finally {
      setEnhancing(false);
    }
  }

  async function designerPass() {
    if (!code || designerBusy || streaming) return;
    setDesignerBusy(true);
    try {
      await run(
        "Elevate the visual design: refine typography scale, spacing rhythm, add subtle micro-animations, improve color contrast, polish details. Keep ALL content, structure, and section order. Return the FULL upgraded document.",
        code,
      );
      toast.success("Designer pass complete");
    } catch {
      toast.error("Designer pass failed");
    } finally {
      setDesignerBusy(false);
    }
  }

  async function downloadZip() {
    if (!code) return;
    try {
      await exportBuildZip({
        html: code,
        prompt: search.q || prompt || title,
        title,
        model,
      });
      toast.success("Downloaded .zip");
      tap();
    } catch {
      toast.error("Export failed");
    }
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

  async function share() {
    const id = parentBuildId ?? buildId;
    const url = id ? `${window.location.origin}/build?id=${id}` : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Build link copied");
      tap();
    } catch {
      toast.error("Copy failed");
    }
  }

  async function snapshot() {
    if (!projectId || !parentBuildId) {
      toast.message("Save a build first");
      return;
    }
    const label = window.prompt("Snapshot label", title.slice(0, 40));
    if (!label) return;
    try {
      await createSnapshot({ buildId: parentBuildId, projectId, label });
      toast.success("Snapshot saved");
      tap();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Snapshot failed");
    }
  }

  function submit() {
    if (!prompt.trim() || streaming) return;
    const p = prompt.trim();
    setPrompt("");
    setShowSlash(false);
    void run(p, code);
    tap(10);
  }

  function onPromptChange(v: string) {
    setPrompt(v);
    const first = v.trimStart();
    setShowSlash(first.startsWith("/") && !first.includes(" "));
  }

  function onPickPreset(p: PromptPreset) {
    setPrompt(p.template);
    setShowSlash(false);
  }

  function changeModel(m: "flash" | "pro") {
    setModelState(m);
    setModel(m);
    toast.message(`Model: ${m === "flash" ? "Mistral Small" : "Mistral Large"}`);
  }

  // Quality score, recomputed after streaming settles (never mid-stream)
  const quality = React.useMemo(() => {
    if (!code || streaming) return null;
    try {
      return auditHtml(code);
    } catch {
      return null;
    }
  }, [code, streaming]);

  async function handleTitleCommit(newTitle: string) {
    if (newTitle === title) return;
    setTitle(newTitle);
    if (!projectId) return;
    try {
      await renameProject(projectId, newTitle);
      toast.success("Project renamed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename failed");
    }
  }

  const docKB = bytes / 1024;

  const header = (
    <StudioHeader
      title={title}
      onTitleCommit={handleTitleCommit}
      version={version}
      streaming={streaming}
      qualityScore={quality ? quality.score : null}
      designerBusy={designerBusy}
      canDesigner={!!code}
      onDesignerPass={designerPass}
      onStop={stopStream}
      canRegenerate={!!(search.q || prompt || title) && !streaming}
      onRegenerate={regenerate}
      canExport={!!code}
      onDownloadHtml={download}
      onDownloadZip={downloadZip}
      onCopy={copy}
      onShare={share}
      canSnapshot={!!(parentBuildId && projectId)}
      onSnapshot={snapshot}
      projectId={projectId}
      showSplitToggle={isDesktop}
      previewOpen={previewOpen}
      onTogglePreview={() => setPreviewOpen((o) => !o)}
      inspectorOpen={inspectorOpen}
      onToggleInspector={() => setInspectorOpen((o) => !o)}
      onOpenPalette={() => setPaletteOpen(true)}
    />
  );

  const palette = (
    <StudioCommandPalette
      open={paletteOpen}
      onOpenChange={setPaletteOpen}
      canDesigner={!!code && !streaming}
      onDesignerPass={designerPass}
      onToggleInspector={() => setInspectorOpen((o) => !o)}
      canSnapshot={!!(parentBuildId && projectId)}
      onSnapshot={snapshot}
      canExport={!!code}
      onDownloadHtml={download}
      onDownloadZip={downloadZip}
      onCopy={copy}
      onViewport={(v) => setViewport(v)}
      onModel={changeModel}
      onPickPreset={onPickPreset}
      canSubmit={!!prompt.trim() && !streaming}
      onSubmit={submit}
    />
  );

  const inspector = (
    <StudioInspector
      open={inspectorOpen}
      onClose={() => setInspectorOpen(false)}
      model={model}
      onModelChange={changeModel}
      temperature={temperature}
      onTemperatureChange={setTemperature}
      maxTokens={maxTokens}
      onMaxTokens={setMaxTokens}
      streaming={streaming}
      phase={phase}
      docKB={docKB}
      latencyMs={latencyMs}
      milestonesDone={milestones.size}
      milestonesTotal={MILESTONE_ORDER.length}
    />
  );

  const composer = (
    <StudioComposer
      prompt={prompt}
      onPromptChange={onPromptChange}
      onSubmit={submit}
      onEnhance={enhancePrompt}
      enhancing={enhancing}
      streaming={streaming}
      showSlash={showSlash}
      onPickPreset={onPickPreset}
      onCloseSlash={() => setShowSlash(false)}
      placeholder={code ? "Iterate, or type / for presets" : "Describe what to build (try /landing)…"}
    />
  );

  const onFix = (fix: string) => {
    setPrompt(fix);
    setTab("preview");
    setLeftMode("code");
  };

  // ─── Mobile: tabbed layout (< 1024px) ───
  if (!isDesktop) {
    return (
      <div
        className="relative bg-background text-foreground overflow-hidden"
        style={{ height: "100dvh", width: "100vw" }}
      >
        <Toaster theme="dark" position="top-center" />
        {inspector}
        {palette}
        <div
          className="relative mx-auto grid h-full w-full max-w-[640px] min-h-0"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "max(env(safe-area-inset-left), 0px)",
            paddingRight: "max(env(safe-area-inset-right), 0px)",
            gridTemplateRows: "auto auto auto 1fr auto",
            rowGap: 0,
          }}
        >
          {header}

          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 hairline-bottom min-h-0">
            <TabBtn active={tab === "preview"} onClick={() => setTab("preview")} icon={Eye} label="Preview" />
            <TabBtn active={tab === "code"} onClick={() => setTab("code")} icon={Code2} label="Code" />
            <TabBtn active={tab === "quality"} onClick={() => setTab("quality")} icon={Gauge} label="Quality" />
            <div className="ml-auto flex items-center gap-2">
              {tab === "preview" && <ViewportSwitcher value={viewport} onChange={setViewport} />}
              {streaming && (
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-phosphor">
                  <span className="size-1.5 rounded-full bg-phosphor animate-phosphor" />
                  stream
                </span>
              )}
            </div>
          </div>

          {/* Stream progress + milestones */}
          <div>
            <StreamProgress phase={phase} bytes={bytes} elapsedMs={elapsedMs} />
            {(streaming || milestones.size > 0) && (
              <StreamTimeline reached={milestones} active={streaming} />
            )}
          </div>

          {/* Stage */}
          <main className="relative min-h-0 overflow-hidden">
            {tab === "preview" ? (
              <ViewportWrap viewport={viewport}>
                <PreviewFrame html={code} />
              </ViewportWrap>
            ) : tab === "quality" ? (
              <QualityPanel html={code} onFix={onFix} />
            ) : (
              <CodePane code={code} streaming={streaming} />
            )}
          </main>

          {composer}
        </div>
      </div>
    );
  }

  // ─── Desktop / tablet: split studio (>= 1024px) ───
  const leftPane = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Left mode tabs */}
      <div className="flex shrink-0 items-center gap-1 px-3 py-1.5 hairline-bottom">
        <TabBtn active={leftMode === "code"} onClick={() => setLeftMode("code")} icon={Code2} label="Code" />
        <TabBtn active={leftMode === "stream"} onClick={() => setLeftMode("stream")} icon={Eye} label="Stream" />
        <TabBtn active={leftMode === "quality"} onClick={() => setLeftMode("quality")} icon={Gauge} label="Quality" />
        {streaming && (
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-phosphor">
            <span className="size-1.5 rounded-full bg-phosphor animate-phosphor" />
            stream
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {leftMode === "code" && <CodePane code={code} streaming={streaming} />}
        {leftMode === "quality" && <QualityPanel html={code} onFix={onFix} />}
        {leftMode === "stream" && (
          <div className="h-full overflow-y-auto no-scrollbar">
            <StreamProgress phase={phase} bytes={bytes} elapsedMs={elapsedMs} />
            {(streaming || milestones.size > 0) && (
              <StreamTimeline reached={milestones} active={streaming} />
            )}
            <div className="px-3 py-3">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                Prompt history
              </div>
              {history.length === 0 && (
                <div className="font-mono text-[10px] text-muted-foreground/60">No prompts yet this session.</div>
              )}
              <ul className="space-y-1">
                {history.map((h) => (
                  <li
                    key={h.at}
                    className="hairline rounded-[5px] bg-surface px-2.5 py-2 font-mono text-[11px] text-muted-foreground"
                  >
                    <span className="mr-2 text-[9px] uppercase tracking-widest text-amber">
                      {new Date(h.at).toLocaleTimeString()}
                    </span>
                    <span className="break-words">{h.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {composer}
    </div>
  );

  const previewPane = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Preview toolbar */}
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5 hairline-bottom">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Preview</span>
        <div className="ml-auto flex items-center gap-2">
          <ViewportSwitcher value={viewport} onChange={setViewport} />
        </div>
      </div>
      <DeviceStage viewport={viewport}>
        <PreviewFrame html={code} />
      </DeviceStage>
    </div>
  );

  return (
    <div
      className="relative bg-background text-foreground overflow-hidden"
      style={{ height: "100dvh", width: "100vw" }}
    >
      <Toaster theme="dark" position="top-center" />
      {inspector}
      {palette}
      <div className="flex h-full min-h-0 flex-col">
        {header}
        <div className="min-h-0 flex-1 overflow-hidden">
          {previewOpen ? (
            <Group orientation="horizontal" className="h-full" style={{ height: "100%" }}>
              <Panel id="work" minSize="30%" defaultSize="52%" className="min-h-0">
                {leftPane}
              </Panel>
              <Separator
                className="w-px bg-[color:var(--border)] transition-colors hover:bg-[color:var(--amber)]"
                aria-label="Resize panes"
              />
              <Panel id="preview" minSize="30%" defaultSize="48%" className="min-h-0">
                {previewPane}
              </Panel>
            </Group>
          ) : (
            leftPane
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceStage({
  viewport,
  children,
}: {
  viewport: ViewportKey;
  children: React.ReactNode;
}) {
  const w = VIEWPORT_WIDTH[viewport];
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background/50 p-2">
      <div
        className="mx-auto h-full hairline overflow-hidden bg-white transition-[width] duration-300 ease-out"
        style={{ width: w === null ? "100%" : Math.min(w, 9999), maxWidth: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

function ViewportWrap({
  viewport,
  children,
}: {
  viewport: ViewportKey;
  children: React.ReactNode;
}) {
  const w = VIEWPORT_WIDTH[viewport];
  if (w === null) return <div className="h-full w-full">{children}</div>;
  return (
    <div className="h-full w-full overflow-auto bg-background/50 grid place-items-start justify-center p-2">
      <div
        className="h-full hairline transition-[width] duration-300 ease-out bg-white"
        style={{ width: Math.min(w, 9999), maxWidth: "100%" }}
      >
        {children}
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
