import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, GitFork } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { getProjectBySlug, getLatestBuildForProject } from "@/lib/builds.cloud";
import { supabase } from "@/integrations/supabase/client";
import { tap } from "@/hooks/useHaptic";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — H4CK3D` },
      { name: "description", content: "A build shared via H4CK3D." },
      { property: "og:title", content: `${params.slug} — H4CK3D` },
      { property: "og:description", content: "Live AI-generated build." },
    ],
  }),
  component: PublicPreview,
});

function PublicPreview() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [html, setHtml] = React.useState<string | null>(null);
  const [buildId, setBuildId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState<"loading" | "found" | "missing">("loading");

  React.useEffect(() => {
    (async () => {
      try {
        const proj = await getProjectBySlug(slug);
        if (!proj) {
          setStatus("missing");
          return;
        }
        const latest = await getLatestBuildForProject(proj.id);
        if (!latest) {
          setStatus("missing");
          return;
        }
        setName(proj.name);
        setHtml(latest.html);
        setBuildId(latest.id);
        setStatus("found");
      } catch {
        setStatus("missing");
      }
    })();
  }, [slug]);

  async function remix() {
    if (!buildId) return;
    tap();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate({ to: "/auth" });
      // After login the user can land on /remix/$buildId; provide a quick link via toast for now
      toast.message("Sign in to remix");
      return;
    }
    navigate({ to: "/remix/$buildId", params: { buildId } });
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <Toaster theme="dark" position="top-center" />
      {status === "loading" && (
        <div className="grid place-items-center flex-1">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {status === "missing" && (
        <div className="grid place-items-center flex-1">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">▒ build not found ▒</p>
        </div>
      )}
      {status === "found" && html && (
        <>
          <iframe
            srcDoc={html}
            sandbox="allow-scripts"
            title={name}
            className="flex-1 w-full border-0 bg-black"
          />
          <div
            className="hairline-top bg-background/85 backdrop-blur-xl px-3 py-2 flex items-center gap-2"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
          >
            <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-amber">
              H4CK3D
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate flex-1">
              · {name}
            </span>
            <button
              onClick={remix}
              className="inline-flex items-center gap-1.5 rounded-[5px] bg-phosphor text-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest"
            >
              <GitFork className="size-3.5" /> Remix
            </button>
          </div>
        </>
      )}
    </main>
  );
}