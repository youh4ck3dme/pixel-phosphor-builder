import * as React from "react";

export function useRotatingPlaceholder(items: string[], intervalMs = 3000) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % items.length), intervalMs);
    return () => window.clearInterval(id);
  }, [items.length, intervalMs]);
  return items[i] ?? "";
}