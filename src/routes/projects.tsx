import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Loader2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listProjects,
  listBuilds,
  getLatestProjectPrompt,
  deleteProject,
  type CloudProject,
} from "@/lib/builds.cloud";
import { tap } from "@/hooks/useHaptic";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — H4CK3D" },
      { name: "description", content: "Your saved H4CK3D builds." },
    ],
  }),
  component: ProjectsPage,
});

type Row = CloudProject & { lastPrompt?: string };

function ProjectsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const projs = await listProjects();
      // fetch latest build prompt per project — prompt-only query, no html column
      const enriched = await Promise.all(
        projs.map(async (p) => {
          try {
            const lastPrompt = await getLatestProjectPrompt(p.id);
            return { ...p, lastPrompt };
          } catch {
            return p;
          }
        })
      );
      setRows(enriched);
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
    });
  }, [load]);

  async function onDelete(id: string) {
    if (!confirm("Delete this project and all its builds?")) return;
    try {
      await deleteProject(id);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Deleted");
      tap();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function openLatest(projectId: string) {
    const builds = await listBuilds(projectId);
    const latest = builds[0];
    if (!latest) {
      navigate({ to: "/build", search: {} });
      return;
    }
    navigate({ to: "/build", search: { id: latest.id } });
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <Toaster theme="dark" position="top-center" />
      <header className="hairline-bottom px-3 py-3 flex items-center gap-2">
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

      <div className="flex-1 mx-auto w-full max-w-[640px] px-3 py-4 overflow-y-auto min-h-0">
        {loading && (
          <div aria-busy="true" aria-live="polite">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3 inline-flex items-center gap-2">
              <Loader2 className="size-3 animate-spin" /> Loading your projects…
            </div>
            <ul className="grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="hairline rounded-[5px] bg-surface p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 w-1/2 rounded-[3px] bg-foreground/10 animate-pulse" />
                    <div className="h-3 w-3/4 rounded-[3px] bg-foreground/5 animate-pulse" />
                    <div className="h-2.5 w-1/3 rounded-[3px] bg-foreground/5 animate-pulse" />
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

        {!loading && authed && rows.length > 0 && (
          <ul className="grid gap-2">
            {rows.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="hairline rounded-[5px] bg-surface p-3 flex items-center gap-3"
              >
                <button
                  onClick={() => openLatest(p.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-mono text-sm truncate text-foreground">{p.name}</div>
                  {p.lastPrompt && (
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {p.lastPrompt}
                    </div>
                  )}
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    {new Date(p.updated_at).toLocaleDateString()} · {p.visibility}
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