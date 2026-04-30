import * as React from "react";
import { motion } from "framer-motion";
import { BuildNode } from "./BuildNode";
import type { BuildTreeNode } from "@/lib/builds.tree";

type Props = {
  roots: BuildTreeNode[];
  activeId?: string | null;
  selectedIds: string[];
  onOpen: (id: string) => void;
  onBranch: (id: string) => void;
  onSnapshot: (id: string) => void;
  onToggleSelect: (id: string) => void;
};

export function BuildTree({ roots, activeId, selectedIds, onOpen, onBranch, onSnapshot, onToggleSelect }: Props) {
  if (roots.length === 0) {
    return (
      <div className="text-center py-16 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        ▒▒▒ no builds yet ▒▒▒
      </div>
    );
  }
  return (
    <ul className="relative">
      {roots.map((node, i) => (
        <TreeRow
          key={node.id}
          node={node}
          index={i}
          activeId={activeId}
          selectedIds={selectedIds}
          onOpen={onOpen}
          onBranch={onBranch}
          onSnapshot={onSnapshot}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </ul>
  );
}

function TreeRow({
  node,
  index,
  activeId,
  selectedIds,
  onOpen,
  onBranch,
  onSnapshot,
  onToggleSelect,
}: {
  node: BuildTreeNode;
  index: number;
  activeId?: string | null;
  selectedIds: string[];
  onOpen: (id: string) => void;
  onBranch: (id: string) => void;
  onSnapshot: (id: string) => void;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <li className="relative">
      <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.3) }}
        className="relative"
        style={{ paddingLeft: node.depth * 18 }}
      >
        {/* tree connector */}
        {node.depth > 0 && (
          <span
            aria-hidden
            className="absolute top-0 bottom-0 w-px bg-border"
            style={{ left: node.depth * 18 - 9 }}
          />
        )}
        {node.depth > 0 && (
          <span
            aria-hidden
            className="absolute top-7 h-px bg-border"
            style={{ left: node.depth * 18 - 9, width: 9 }}
          />
        )}
        <div className="py-1.5">
          <BuildNode
            node={node}
            active={activeId === node.id}
            selected={selectedIds.includes(node.id)}
            onOpen={() => onOpen(node.id)}
            onBranch={() => onBranch(node.id)}
            onSnapshot={() => onSnapshot(node.id)}
            onSelect={() => onToggleSelect(node.id)}
          />
        </div>
      </motion.div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c, i) => (
            <TreeRow
              key={c.id}
              node={c}
              index={i}
              activeId={activeId}
              selectedIds={selectedIds}
              onOpen={onOpen}
              onBranch={onBranch}
              onSnapshot={onSnapshot}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}