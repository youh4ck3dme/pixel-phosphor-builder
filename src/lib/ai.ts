export const SYSTEM_PROMPT = `You are an elite front-end engineer. Output ONE complete, self-contained HTML document and nothing else.

RULES:
- Start with <!doctype html> on the very first line.
- All CSS must be inline in a <style> tag in the <head>.
- All JavaScript must be inline in a <script> tag.
- No external URLs except fonts.googleapis.com / fonts.gstatic.com (optional).
- No markdown code fences. No prose. No explanation. ONLY HTML.
- Mobile-first, accessible, beautiful, modern. Dark theme by default unless specified otherwise.
- Use system fonts or Google Fonts. Use clamp() for fluid type. Use semantic HTML.
- If the user iterates, MODIFY the previous HTML they provide rather than starting from scratch.`;

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export type ModelKey = "flash" | "pro";
export type ProviderKey = "mistral" | "lovable";

export type ProviderConfig = {
  baseUrl: string;
  models: Record<ModelKey, string>;
};

// Mistral is the primary AI provider; the Lovable gateway stays as a fallback
// so the app keeps working when MISTRAL_API_KEY is not configured.
export const PROVIDERS: Record<ProviderKey, ProviderConfig> = {
  mistral: {
    baseUrl: "https://api.mistral.ai/v1/chat/completions",
    models: {
      flash: "mistral-small-latest",
      pro: "mistral-large-latest",
    },
  },
  lovable: {
    baseUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    models: {
      flash: "google/gemini-2.5-flash",
      pro: "google/gemini-2.5-pro",
    },
  },
};

/**
 * Resolve the active AI provider. Keys are read from the server environment
 * only and are never exposed to the client bundle.
 * Priority: MISTRAL_API_KEY (primary) → LOVABLE_API_KEY (fallback).
 */
export function resolveProvider():
  | { provider: ProviderKey; config: ProviderConfig; apiKey: string }
  | null {
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    return { provider: "mistral", config: PROVIDERS.mistral, apiKey: mistralKey };
  }
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    return { provider: "lovable", config: PROVIDERS.lovable, apiKey: lovableKey };
  }
  return null;
}