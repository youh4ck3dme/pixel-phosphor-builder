import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Loader2, FolderOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listProjects,
  deleteProject,
  getLatestBuildMeta,
  countBuilds,
  type CloudProject,
  type LatestBuildMeta,
} from "@/lib/builds.cloud";
import { getModelUsage, usagePercent, formatTokens, MODEL_TOKEN_CAPS, type ModelUsage } from "@/lib/usage.telemetry";
import { tap } from "@/hooks/useHaptic";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — H4CK3D" },
      { name: "description", content: "Your saved H4CK3D builds." },
    ],
  }),
  component: ProjectsPage,
});

type Row = CloudProject & { lastPrompt?: string; latest?: LatestBuildMeta | null };

function ProjectsPage() {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [loading, setLoading] = React.useState(true);
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedCount, setSelectedCount] = React.useState<number | null>(null);
  const [usage, setUsage] = React.useState<ModelUsage[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const projs = await listProjects();
      // lightweight enrichment: latest build meta per project — id/prompt/model only, never html
      const enriched = await Promise.all(
        projs.map(async (p) => {
          try {
            const latest = await getLatestBuildMeta(p.id);
            return { ...p, latest, lastPrompt: latest?.prompt };
          } catch {
            return p;
          }
        }),
      );
      setRows(enriched);
      setSelectedId((prev) => prev ?? enriched[0]?.id ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);
      void load();
      getModelUsage().then(setUsage).catch(() => setUsage([]));
    });
  }, [load]);

  // Server-side build count for the focused project (desktop preview pane)
  React.useEffect(() => {
    if (!isDesktop || !selectedId) return;
    let cancelled = false;
    countBuilds(selectedId)
      .then((n) => {
        if (!cancelled) setSelectedCount(n);
      })
      .catch(() => {
        if (!cancelled) setSelectedCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isDesktop, selectedId]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.lastPrompt ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  async function onDelete(id: string) {
    if (!confirm("Delete this project and all its builds?")) return;
    try {
      await deleteProject(id);
      setRows((r) => r.filter((x) => x.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
      toast.success("Deleted");
      tap();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function openLatest(projectId: string, latestId?: string) {
    tap();
    if (latestId) {
      navigate({ to: "/build", search: { id: latestId } });
      return;
    }
    navigate({ to: "/build", search: {} });
  }

  const usageChips = usage
    .map((u) => ({
      model: u.model,
      used: formatTokens(u.tokensUsed),
      percent: usagePercent(u.model, u.tokensUsed),
    }))
    .slice(0, 2);

  return (
    <main className="min-h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <Toaster theme="dark" position="top-center" />
      <header className="hairline-bottom px-3 py-3 flex items-center gap-2 shrink-0">
        <Link to="/" className="size-9 rounded-[5px] grid place-items-center hairline" aria-label="Back" onClick={() => tap()}>
          <ArrowLeft className="size-4" />
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Projects
        </span>
        <Link
          to="/build"
          search={{}}
          onClick={() => tap()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-[5px] bg-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-black"
        >
          <Plus className="size-3.5" />
          New
        </Link>
      </header>

      <div className="flex-1 mx-auto w-full max-w-[640px] px-3 py-4 overflow-y-auto min-h-0 lg:max-w-none lg:px-4">
        {loading && (
          <div aria-busy="true" aria-live="polite">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3 inline-flex items-center gap-2">
              <Loader2 className="size-3 animate-spin" /> Loading your projects…
            </div>
            <ul className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="hairline rounded-[5px] bg-surface p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 w-1/2 rounded-[3px] bg-foreground/10 animate-pulse" />
                    <div className="h-3 w-3/4 rounded-[3px] bg-foreground/5 animate-pulse" />
                  </div>
                  <div className="size-9 rounded-[5px] hairline" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && authed === false && (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">Sign in to view your projects.</p>
            <Link
              to="/auth"
              className="mt-4 inline-block rounded-[5px] px-4 py-2 text-sm font-mono uppercase tracking-widest text-background"
              style={{ background: "var(--phosphor)" }}
            >
              Sign in
            </Link>
          </div>
        )}

        {!loading && authed && rows.length === 0 && (
          <div className="text-center py-20">
            <FolderOpen className="size-8 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No projects yet.</p>
            <Link
              to="/build"
              search={{}}
              className="mt-4 inline-block rounded-[5px] px-4 py-2 text-sm font-mono uppercase tracking-widest text-black"
              style={{ background: "var(--amber)" }}
            >
              Create your first build
            </Link>
          </div>
        )}

        {!loading && authed && rows.length > 0 && isDesktop && (
          <div className="grid h-full min-h-0 grid-cols-[minmax(320px,380px)_1fr] gap-4">
            {/* Left: searchable project list */}
            <div className="flex min-h-0 flex-col">
              <div className="relative shrink-0">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  aria-label="Search projects"
                  className="w-full rounded-[5px] bg-surface hairline py-2 pl-8 pr-3 font-mono text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <ul className="mt-3 grid gap-2 overflow-y-auto pr-1 no-scrollbar">
                {filtered.map((p, i) => (
                  <li key={p.id}>
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      onClick={() => {
                        setSelectedId(p.id);
                        setSelectedCount(null);
                      }}
                      onSelect={() => tap()}
                      className={`w-full rounded-[5px] p-3 text-left transition-colors ${
                        selectedId === p.id ? "bg-surface-2 hairline" : "bg-surface hairline hover:bg-surface-2"
                      }`}
                      style={{ borderColor: selectedId === p.id ? "var(--amber)" : undefined }}
                    >
                      <div className="truncate font-mono text-[12px] text-foreground">{p.name}</div>
                      {p.lastPrompt && (
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{p.lastPrompt}</div>
                      )}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                        {p.latest && (
                          <span
                            className="rounded bg-surface hairline px-1 py-px font-mono text-[8px] uppercase tracking-wider"
                            style={{
                              color: p.latest.model === "pro" ? "var(--amber)" : "var(--phosphor)",
                            }}
                          >
                            {p.latest.model}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="py-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    No match
                  </li>
                )}
              </ul>
            </div>

            {/* Right: focused project preview */}
            <aside className="flex min-h-0 flex-col rounded-[5px] bg-surface hairline p-4">
              {selected ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {selected.visibility === "public" ? "public project" : selected.visibility === "unlisted" ? "unlisted project" : "private project"}
                  </div>
                  <h2 className="mt-1 truncate font-display text-xl font-medium text-amber">{selected.name}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-[4px] bg-surface-2 hairline px-1.5 py-0.5 font-mono text-[9px] text-phosphor">
                      v{selectedCount ?? "?"}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      updated {new Date(selected.updated_at).toLocaleDateString()}
                    </span>
                    {selected.latest && (
                      <span
                        className="rounded bg-surface hairline px-1 py-px font-mono text-[8px] uppercase tracking-wider"
                        style={{ color: selected.latest.model === "pro" ? "var(--amber)" : "var(--phosphor)" }}
                      >
                        {selected.latest.model}
                      </span>
                    )}
                  </div>
                  {selected.lastPrompt && (
                    <p className="mt-3 min-h-0 flex-1 overflow-y-auto no-scrollbar rounded-[5px] bg-background hairline p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {selected.lastPrompt}
                    </p>
                  )}
                  {usageChips.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Quota</span>
                      {usageChips.map((c) => (
                        <span
                          key={c.model}
                          className="rounded-[4px] bg-surface-2 hairline px-1.5 py-0.5 font-mono text-[9px]"
                          style={{ color: c.percent >= 80 ? "var(--amber)" : "var(--phosphor)" }}
                        >
                          {c.model} {c.used}/{formatTokens(MODEL_TOKEN_CAPS[c.model] ?? 1_000_000)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => openLatest(selected.id, selected.latest?.id)}
                      className="inline-flex items-center gap-1.5 rounded-[5px] bg-amber px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-black"
                    >
                      Open latest build
                    </button>
                    <button
                      onClick={() => onDelete(selected.id)}
                      aria-label="Delete project"
                      className="grid size-9 place-items-center rounded-[5px] hairline text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid h-full place-items-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Select a project
                </div>
              )}
            </aside>
          </div>
        )}

        {!loading && authed && rows.length > 0 && !isDesktop && (
          <ul className="grid gap-2">
            {filtered.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="hairline rounded-[5px] bg-surface p-3 flex items-center gap-3"
              >
                <button
                  onClick={() => openLatest(p.id, p.latest?.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-mono text-sm truncate text-foreground">{p.name}</div>
                  {p.lastPrompt && (
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {p.lastPrompt}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {new Date(p.updated_at).toLocaleDateString()} · {p.visibility}
                    </span>
                    {p.latest && (
                      <span
                        className="rounded bg-surface hairline px-1 py-px font-mono text-[8px] uppercase tracking-wider"
                        style={{ color: p.latest.model === "pro" ? "var(--amber)" : "var(--phosphor)" }}
                      >
                        {p.latest.model}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => onDelete(p.id)}
                  aria-label="Delete"
                  className="size-9 grid place-items-center rounded-[5px] hairline text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
