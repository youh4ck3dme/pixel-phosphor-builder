import * as React from "react";

export function CodePane({ code, streaming }: { code: string; streaming: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (streaming && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [code, streaming]);

  const lines = (code || "").split("\n");

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-auto bg-background no-scrollbar"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {/* CRT scanline overlay */}
      <div className="pointer-events-none sticky top-0 z-10 h-0">
        <div className="scanlines absolute inset-0" />
      </div>

      {!code && (
        <div className="p-4 space-y-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded-[2px]"
              style={{
                width: `${30 + ((i * 17) % 60)}%`,
                background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--phosphor) 18%, transparent), transparent)",
                animation: "shimmer 1.6s infinite linear",
                backgroundSize: "200% 100%",
              }}
            />
          ))}
        </div>
      )}

      {code && (
        <pre className="m-0 px-3 py-3 text-[12px] leading-[1.55] text-phosphor whitespace-pre-wrap break-all">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span
                className="select-none pr-3 text-right text-muted-foreground/60"
                style={{ minWidth: 32, fontVariantNumeric: "tabular-nums" }}
              >
                {i + 1}
              </span>
              <span className="flex-1">
                {line || "\u00A0"}
                {streaming && i === lines.length - 1 && (
                  <span className="ml-0.5 inline-block h-[12px] w-[6px] -mb-0.5 animate-caret bg-phosphor align-middle" />
                )}
              </span>
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}