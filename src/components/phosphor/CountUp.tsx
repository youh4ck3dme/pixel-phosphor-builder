import * as React from "react";
import { animate, useInView } from "framer-motion";

export function CountUp({
  to,
  duration = 1.4,
  decimals = 0,
  suffix = "",
  prefix = "",
}: {
  to: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  React.useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, to, duration, decimals, suffix, prefix]);

  return <span ref={ref}>{`${prefix}0${suffix}`}</span>;
}