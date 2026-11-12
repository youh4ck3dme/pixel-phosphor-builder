import * as React from "react";
import { GitBranch, Star, Eye, Code2 } from "lucide-react";
import type { BuildTreeNode } from "@/lib/builds.tree";

type Props = {
  node: BuildTreeNode;
  active?: boolean;
  selected?: boolean;
  focused?: boolean;
  onOpen?: () => void;
  onBranch?: () => void;
  onSnapshot?: () => void;
  onSelect?: () => void;
  onFocus?: () => void;
};

export function BuildNode({
  node,
  active,
  selected,
  focused,
  onOpen,
  onBranch,
  onSnapshot,
  onSelect,
  onFocus,
}: Props) {
  const time = new Date(node.created_at);
  const ago = formatAgo(time);

  return (
    <div
      onClick={onFocus}
      className={`relative hairline rounded-[5px] bg-surface p-3 transition-colors ${onFocus ? "cursor-pointer" : ""}`}
      style={{
        borderColor: focused
          ? "var(--phosphor)"
          : active
          ? "var(--phosphor)"
          : selected
          ? "var(--amber)"
          : undefined,
        boxShadow: focused || active ? "0 0 24px -8px var(--phosphor)" : undefined,
      }}
    >
      {/* Mini preview thumbnail */}
      <div className="flex gap-3">
        <button
          onClick={onOpen}
          className="relative shrink-0 hairline rounded-[5px] overflow-hidden bg-black"
          style={{ width: 84, height: 56 }}
          aria-label="Open build"
        >
          <iframe
            srcDoc={node.html}
            sandbox=""
            title="thumb"
            className="pointer-events-none absolute top-0 left-0"
            style={{
              width: 560,
              height: 374,
              transform: "scale(0.15)",
              transformOrigin: "top left",
              border: 0,
            }}
          />
          <span className="absolute bottom-0.5 right-0.5 font-mono text-[8px] uppercase tracking-widest text-phosphor bg-black/70 px-1 rounded-[2px]">
            {node.model}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="font-mono text-[12px] text-foreground truncate">
            {node.prompt || "(empty prompt)"}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            {ago} · {(node.html?.length ?? 0).toLocaleString()}b
          </div>
          <div className="mt-2 flex items-center gap-1">
            <NodeBtn onClick={onOpen} icon={Eye} label="Open" />
            <NodeBtn onClick={onBranch} icon={GitBranch} label="Branch" />
            <NodeBtn onClick={onSnapshot} icon={Star} label="Snap" />
            <button
              onClick={onSelect}
              className="ml-auto inline-flex items-center gap-1 rounded-[5px] hairline px-1.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-amber"
              aria-pressed={selected}
              style={{ borderColor: selected ? "var(--amber)" : undefined, color: selected ? "var(--amber)" : undefined }}
            >
              <Code2 className="size-3" />
              {selected ? "Sel ✓" : "Diff"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeBtn({
  onClick,
  icon: Icon,
  label,
}: {
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-[5px] hairline px-1.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-amber"
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}

function formatAgo(d: Date) {
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleDateString();
}