import { supabase } from "@/integrations/supabase/client";

/**
 * Real token-quota telemetry derived from the user's builds.
 * Token counts are a proxy: (prompt.length + html.length) / 4 chars per token.
 * Server-side aggregation isn't possible via PostgREST select, so we bound
 * the payload to the most recent builds only.
 */
const RECENT_BUILD_LIMIT = 20;
const CHARS_PER_TOKEN = 4;

export const MODEL_TOKEN_CAPS: Record<string, number> = {
  flash: 1_000_000,
  pro: 1_000_000,
};

export type ModelUsage = {
  model: string;
  tokensUsed: number;
};

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

/** Aggregate tokens per model across the user's most recent builds. */
export async function getModelUsage(): Promise<ModelUsage[]> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return []; // guests keep the static mock telemetry

  const { data: builds, error } = await supabase
    .from("builds")
    .select("model, prompt, html")
    .order("created_at", { ascending: false })
    .limit(RECENT_BUILD_LIMIT);
  if (error || !builds) return [];

  const map = new Map<string, number>();
  for (const b of builds as Array<{ model?: string | null; prompt?: string | null; html?: string | null }>) {
    const model = typeof b.model === "string" ? b.model : "flash";
    const tokens = Math.ceil(
      ((b.prompt?.length ?? 0) + (b.html?.length ?? 0)) / CHARS_PER_TOKEN,
    );
    map.set(model, (map.get(model) ?? 0) + tokens);
  }
  return Array.from(map.entries()).map(([model, tokensUsed]) => ({ model, tokensUsed }));
}

export function usagePercent(model: string, tokensUsed: number): number {
  const cap = MODEL_TOKEN_CAPS[model];
  if (!cap) return 100;
  return Math.max(0, Math.min(100, Math.round((tokensUsed / cap) * 100)));
}
