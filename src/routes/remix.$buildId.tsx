import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { remixBuild } from "@/lib/builds.cloud";

export const Route = createFileRoute("/remix/$buildId")({
  head: () => ({
    meta: [
      { title: "Remix — H4CK3D" },
      { name: "description", content: "Fork this build into your account." },
    ],
  }),
  component: RemixRoute,
});

function RemixRoute() {
  const { buildId } = Route.useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }
      try {
        const { build } = await remixBuild(buildId);
        toast.success("Remixed into your projects");
        navigate({ to: "/build", search: { id: build.id }, replace: true });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Remix failed");
        navigate({ to: "/projects" });
      }
    })();
  }, [buildId, navigate]);

  return (
    <main className="min-h-[100dvh] grid place-items-center bg-background text-foreground">
      <Toaster theme="dark" position="top-center" />
      <div className="text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground mx-auto" />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Forking build…
        </p>
      </div>
    </main>
  );
}