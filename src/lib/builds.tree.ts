import type { CloudBuild } from "./builds.cloud";

export type BuildTreeNode = CloudBuild & {
  children: BuildTreeNode[];
  depth: number;
};

/**
 * Convert a flat list of builds into a forest of trees by parent_build_id.
 * Roots = builds with no parent (or whose parent is missing from the list).
 * Sorted ascending by created_at so the oldest is at the top.
 */
export function buildTreeFromList(builds: CloudBuild[]): BuildTreeNode[] {
  const byId = new Map<string, BuildTreeNode>();
  for (const b of builds) {
    byId.set(b.id, { ...b, children: [], depth: 0 });
  }
  const roots: BuildTreeNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.parent_build_id;
    if (parentId && byId.has(parentId)) {
      const parent = byId.get(parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // assign depth + sort
  const walk = (n: BuildTreeNode, depth: number) => {
    n.depth = depth;
    n.children.sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const c of n.children) walk(c, depth + 1);
  };
  roots.sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const r of roots) walk(r, 0);
  return roots;
}

/** Flatten tree into a render-ordered list (depth-first, ascending). */
export function flattenTree(roots: BuildTreeNode[]): BuildTreeNode[] {
  const out: BuildTreeNode[] = [];
  const visit = (n: BuildTreeNode) => {
    out.push(n);
    for (const c of n.children) visit(c);
  };
  for (const r of roots) visit(r);
  return out;
}