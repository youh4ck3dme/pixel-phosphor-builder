import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — H4CK3D" },
      { name: "description", content: "Set a new password for your H4CK3D account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Supabase puts recovery tokens in the URL hash. The client picks them up automatically.
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
    } else {
      // No recovery context — also allow if user already has a session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
        else {
          toast.error("Invalid or expired reset link");
          navigate({ to: "/auth" });
        }
      });
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main className="min-h-[100dvh] grid place-items-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1
          className="font-mono uppercase tracking-tight"
          style={{ fontSize: "clamp(28px, 8vw, 40px)", lineHeight: 1, color: "var(--phosphor)" }}
        >
          New password.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a strong password (min 8 chars).</p>
        <label className="block mt-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</span>
          <div className="mt-1 relative">
            <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full hairline rounded-[5px] bg-transparent pl-9 pr-3 py-2.5 text-base outline-none focus:border-foreground/40"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={busy || password.length < 8}
          className="mt-4 w-full rounded-[5px] py-2.5 text-sm font-mono uppercase tracking-widest text-background disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "var(--phosphor)" }}
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Update password
        </button>
      </form>
    </main>
  );
}