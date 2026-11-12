import * as React from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { SlashMenu } from "@/components/build/SlashMenu";
import type { PromptPreset } from "@/lib/prompt.presets";

export function StudioComposer({
  prompt,
  onPromptChange,
  onSubmit,
  onEnhance,
  enhancing,
  streaming,
  showSlash,
  onPickPreset,
  onCloseSlash,
  placeholder,
}: {
  prompt: string;
  onPromptChange: (v: string) => void;
  onSubmit: () => void;
  onEnhance: () => void;
  enhancing: boolean;
  streaming: boolean;
  showSlash: boolean;
  onPickPreset: (p: PromptPreset) => void;
  onCloseSlash: () => void;
  placeholder: string;
}) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea with a hard cap to avoid layout jumps
  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [prompt]);

  return (
    <div className="shrink-0 px-3 pt-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
      <div
        className="relative flex items-end gap-2 rounded-[5px] px-2 py-2"
        style={{
          background: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {showSlash && (
          <SlashMenu query={prompt.trim()} onPick={onPickPreset} onClose={onCloseSlash} />
        )}
        <textarea
          ref={taRef}
          rows={1}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            } else if (e.key === "Enter" && !e.shiftKey && !showSlash) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          className="flex-1 resize-none bg-transparent px-2 py-1 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ fontSize: "16px", maxHeight: 140 }}
        />
        <button
          onClick={onEnhance}
          disabled={!prompt.trim() || enhancing || streaming}
          aria-label="Enhance prompt (AI)"
          title="Enhance prompt (AI)"
          className="grid size-9 shrink-0 place-items-center rounded-[5px] hairline text-phosphor transition-opacity disabled:opacity-30"
        >
          <Sparkles className={`size-4 ${enhancing ? "animate-pulse" : ""}`} />
        </button>
        <button
          onClick={onSubmit}
          disabled={!prompt.trim() || streaming}
          aria-label="Generate"
          className="grid size-9 shrink-0 place-items-center rounded-[5px] bg-amber text-black transition-opacity disabled:opacity-30"
          style={{ boxShadow: prompt.trim() && !streaming ? "0 0 24px -6px var(--amber)" : "none" }}
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
      <div className="mt-1 px-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        ⌘ + ↵ to generate · / presets · ✦ enhance
      </div>
    </div>
  );
}
