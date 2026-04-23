import { createFileRoute } from "@tanstack/react-router";
import { SYSTEM_PROMPT, MODELS, type ModelKey } from "@/lib/ai";

type Body = {
  prompt: string;
  prevHtml?: string;
  model?: ModelKey;
};

export const Route = createFileRoute("/api/generate")({
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

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const userText = body.prevHtml
          ? `Previous HTML document:\n\n${body.prevHtml}\n\n---\nUser change request:\n${body.prompt}\n\nReturn the FULL updated HTML document.`
          : body.prompt;

        const model = MODELS[body.model ?? "flash"] ?? MODELS.flash;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            stream: true,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userText },
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          if (upstream.status === 429) {
            return new Response(
              JSON.stringify({ error: "Rate limited. Please try again in a moment." }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }
          if (upstream.status === 402) {
            return new Response(
              JSON.stringify({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }),
              { status: 402, headers: { "Content-Type": "application/json" } },
            );
          }
          return new Response(JSON.stringify({ error: text || "AI gateway error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Pipe SSE through directly, just stripping to plain content tokens for ease.
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            let buf = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                let idx: number;
                while ((idx = buf.indexOf("\n")) !== -1) {
                  let line = buf.slice(0, idx);
                  buf = buf.slice(idx + 1);
                  if (line.endsWith("\r")) line = line.slice(0, -1);
                  if (!line.startsWith("data: ")) continue;
                  const data = line.slice(6).trim();
                  if (data === "[DONE]") {
                    controller.close();
                    return;
                  }
                  try {
                    const json = JSON.parse(data);
                    const delta = json.choices?.[0]?.delta?.content;
                    if (typeof delta === "string" && delta.length) {
                      controller.enqueue(encoder.encode(delta));
                    }
                  } catch {
                    /* partial JSON — push back */
                    buf = line + "\n" + buf;
                    break;
                  }
                }
              }
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});