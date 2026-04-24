import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useHaptic } from "@/hooks/useHaptic";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — H4CK3D" },
      { name: "description", content: "Sign in to your H4CK3D builder account." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const tap = useHaptic();
  const [mode, setMode] = React.useState<Mode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    tap();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created", { description: "Check your inbox to confirm your email." });
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent", { description: "Check your inbox." });
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    tap();
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/`,
      });
      if (result.error) throw result.error;
      if (!result.redirected) navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OAuth failed");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="hairline-bottom px-3 py-3 flex items-center gap-2">
        <Link to="/" className="size-9 rounded-[5px] grid place-items-center hairline" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          H4CK3D · {mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in"}
        </span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <h1
            className="font-mono uppercase tracking-tight"
            style={{ fontSize: "clamp(28px, 8vw, 40px)", lineHeight: 1, color: "var(--phosphor)" }}
          >
            {mode === "signup" ? "Boot up." : mode === "forgot" ? "Recover." : "Welcome back."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Create an account to save and sync your builds."
              : mode === "forgot"
              ? "We'll email you a reset link."
              : "Sign in to continue building."}
          </p>

          {mode !== "forgot" && (
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleOAuth("google")}
                className="hairline rounded-[5px] py-2.5 text-sm font-mono uppercase tracking-widest hover:bg-foreground/5 disabled:opacity-50"
              >
                Google
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleOAuth("apple")}
                className="hairline rounded-[5px] py-2.5 text-sm font-mono uppercase tracking-widest hover:bg-foreground/5 disabled:opacity-50"
              >
                Apple
              </button>
            </div>
          )}

          {mode !== "forgot" && (
            <div className="my-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or email
              <span className="h-px flex-1 bg-border" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Display name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full hairline rounded-[5px] bg-transparent px-3 py-2.5 text-base outline-none focus:border-foreground/40"
                  placeholder="Your name"
                />
              </label>
            )}
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</span>
              <div className="mt-1 relative">
                <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full hairline rounded-[5px] bg-transparent pl-9 pr-3 py-2.5 text-base outline-none focus:border-foreground/40"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </label>
            {mode !== "forgot" && (
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</span>
                <div className="mt-1 relative">
                  <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full hairline rounded-[5px] bg-transparent pl-9 pr-3 py-2.5 text-base outline-none focus:border-foreground/40"
                    placeholder="••••••••"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
              </label>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-[5px] py-2.5 text-sm font-mono uppercase tracking-widest text-background disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--phosphor)" }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 flex justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button onClick={() => setMode("forgot")} className="hover:text-foreground">Forgot?</button>
                <button onClick={() => setMode("signup")} className="hover:text-foreground">Sign up →</button>
              </>
            ) : mode === "signup" ? (
              <>
                <span />
                <button onClick={() => setMode("signin")} className="hover:text-foreground">← Sign in</button>
              </>
            ) : (
              <>
                <span />
                <button onClick={() => setMode("signin")} className="hover:text-foreground">← Back</button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}