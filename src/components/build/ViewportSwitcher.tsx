import * as React from "react";

export type ViewportKey = "mobile" | "tablet" | "desktop" | "full";

export const VIEWPORT_WIDTH: Record<ViewportKey, number | null> = {
  mobile: 390,
  tablet: 768,
  desktop: 1280,
  full: null,
};

const ITEMS: { key: ViewportKey; label: string }[] = [
  { key: "mobile", label: "390" },
  { key: "tablet", label: "768" },
  { key: "desktop", label: "1280" },
  { key: "full", label: "full" },
];

export function ViewportSwitcher({
  value,
  onChange,
}: {
  value: ViewportKey;
  onChange: (v: ViewportKey) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-[5px] bg-surface hairline p-0.5">
      {ITEMS.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            aria-pressed={active}
            className="rounded-[4px] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest transition-colors"
            style={{
              background: active ? "var(--amber-dim)" : "transparent",
              color: active ? "var(--amber)" : "color-mix(in oklab, var(--foreground) 50%, transparent)",
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}