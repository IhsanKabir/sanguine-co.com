"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type Props = { children: React.ReactNode };

/**
 * Soft cross-page fade.
 *
 * Re-fires the `ssg-route-fade-in` keyframe on every pathname change *without*
 * remounting children. Earlier versions used a `key` on the wrapper div which
 * forced the entire route subtree to unmount and remount on every navigation:
 * that broke client effects mid-flight (cart hydration, session tracker) and
 * surfaced as a client-side exception on routes like /account post-checkout.
 *
 * Strategy: toggle the animation class off then back on. Setting `animation:
 * none` and forcing a reflow before re-applying restarts the keyframe cleanly.
 * Reduced-motion is honoured by the keyframe rule in motion.css.
 */
export default function RouteTransition({ children }: Props) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.classList.remove("ssg-route-fade");
    // Force a reflow so the browser registers the class removal before we
    // re-add it. Without this the animation does not restart.
    void el.offsetWidth;
    el.classList.add("ssg-route-fade");
  }, [pathname]);

  return (
    <div ref={ref} className="ssg-route-fade" style={{ minHeight: "inherit" }}>
      {children}
    </div>
  );
}
