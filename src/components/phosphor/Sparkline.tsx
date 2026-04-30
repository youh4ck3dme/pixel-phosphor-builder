import * as React from "react";

/** Tiny phosphor-green sparkline. No deps. */
export function Sparkline({
  data,
  color = "var(--phosphor)",
  width = 96,
  height = 28,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const lastY = height - ((data[data.length - 1] - min) / range) * height;
  const reactId = React.useId();
  const gradId = `g${reactId.replace(/[:]/g, "")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block overflow-hidden">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--phosphor)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} opacity="0.08" />
      <polyline
        points={points}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <circle
        cx={width - 1}
        cy={lastY}
        r="1.8"
        fill="var(--phosphor)"
        style={{ filter: "drop-shadow(0 0 3px var(--phosphor))" }}
      />
    </svg>
  );
}

/** Phosphor progress ring. */
export function ProgressRing({
  value,
  size = 36,
  stroke = 2,
  color = "var(--phosphor)",
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="square"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)" }}
      />
    </svg>
  );
}