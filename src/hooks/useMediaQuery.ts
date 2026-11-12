import * as React from "react";

/**
 * SSR-safe media query hook. Always returns false on the server and during
 * the first client render, then switches to the real value after mount —
 * this guarantees hydration renders match and avoids hydration warnings.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
