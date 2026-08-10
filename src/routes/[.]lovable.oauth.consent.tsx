import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthzDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthzDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthzDetails | null; error: Error | null }>;
};

type AuthzDetails = {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

function oauthApi(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-6 text-foreground">
      <p className="max-w-sm font-mono text-[12px] text-muted-foreground">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const clientName = details?.client?.name ?? "an AI client";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4" style={{ color: "var(--phosphor)" }} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Agent integration
          </span>
        </div>
        <h1
          className="mt-3 font-mono uppercase tracking-tight"
          style={{ fontSize: "clamp(22px, 6vw, 30px)", lineHeight: 1.05 }}
        >
          Connect {clientName}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {clientName} will be able to read your projects and builds, and save new builds — acting as
          you. You can revoke access at any time.
        </p>

        {error && (
          <p role="alert" className="mt-3 font-mono text-[11px]" style={{ color: "var(--destructive, #ef4444)" }}>
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex items-center justify-center gap-2 rounded-[5px] py-2.5 font-mono text-sm uppercase tracking-widest text-background disabled:opacity-50"
            style={{ background: "var(--phosphor)" }}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="hairline rounded-[5px] py-2.5 font-mono text-sm uppercase tracking-widest hover:bg-foreground/5 disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}