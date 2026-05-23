import { createFileRoute } from "@tanstack/react-router";

type Body = { prompt: string };

const SYSTEM = `You rewrite short product prompts into a tight 6-line creative brief for an HTML page generator.

Return EXACTLY this format and nothing else (no markdown, no preamble):

Goal: <one sentence>
Audience: <one sentence>
Sections: <comma-separated list>
Style: <visual direction in one sentence>
Constraints: <one sentence — must include "mobile-first">
Tech: single HTML file, inline CSS, no external assets except Google Fonts

Keep it concrete. Preserve the user's intent. If something is missing, make a sensible choice.`;

export const Route = createFileRoute("/api/enhance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!body.prompt?.trim()) {
          return new Response(JSON.stringify({ error: "Empty prompt" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: body.prompt },
            ],
          }),
        });
        if (!upstream.ok) {
          if (upstream.status === 429)
            return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { "Content-Type": "application/json" } });
          if (upstream.status === 402)
            return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { "Content-Type": "application/json" } });
          return new Response(JSON.stringify({ error: "Enhance failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
        const json = await upstream.json();
        const enhanced = json.choices?.[0]?.message?.content?.trim() ?? "";
        return new Response(JSON.stringify({ enhanced }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});