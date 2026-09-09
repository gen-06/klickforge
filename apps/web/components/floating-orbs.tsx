"use client";

import { useEffect, useRef } from "react";

// Each orb's [position/size classes, color classes, ambient float variant,
// parallax depth in px]. Depth controls how far the orb drifts toward the
// cursor — bigger depth reads as "closer" to the viewer.
const ORBS: { pos: string; color: string; float: string; depth: number }[] = [
  {
    pos: "-left-16 top-8 h-64 w-64",
    color: "bg-blue-400/20 dark:bg-blue-500/10",
    float: "animate-float-b",
    depth: 16,
  },
  {
    pos: "right-0 top-24 h-72 w-72",
    color: "bg-purple-400/20 dark:bg-purple-500/10",
    float: "animate-float-a",
    depth: 26,
  },
  {
    pos: "left-1/3 bottom-0 h-56 w-56",
    color: "bg-emerald-400/15 dark:bg-emerald-500/10",
    float: "animate-float-c",
    depth: 11,
  },
];

/** Ambient floating gradient orbs that also drift toward the cursor,
 * layered behind page content. Purely decorative — inert on touch devices
 * and under prefers-reduced-motion. */
export function FloatingOrbs() {
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame: number | null = null;
    let pending: { x: number; y: number } | null = null;

    function apply() {
      frame = null;
      if (!pending) return;
      const { x, y } = pending;
      wrapperRefs.current.forEach((el, i) => {
        if (!el) return;
        const depth = ORBS[i].depth;
        el.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
      });
    }

    function onMove(e: MouseEvent) {
      pending = {
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      };
      if (frame === null) frame = requestAnimationFrame(apply);
    }

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {ORBS.map((orb, i) => (
        <div
          key={i}
          ref={(el) => {
            wrapperRefs.current[i] = el;
          }}
          className={`absolute rounded-full transition-transform duration-300 ease-out ${orb.pos}`}
        >
          <div className={`h-full w-full rounded-full blur-3xl ${orb.color} ${orb.float}`} />
        </div>
      ))}
    </div>
  );
}
