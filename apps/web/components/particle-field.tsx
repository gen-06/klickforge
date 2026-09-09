"use client";

import { useEffect, useRef } from "react";

// Matches the accent palette already used by FloatingOrbs (blue/purple/emerald)
// plus a warm accent for variety, at low alpha so it reads as dust, not confetti.
const COLORS = ["#60a5fa", "#a78bfa", "#34d399", "#fbbf24"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

/** A field of tiny drifting dots that part around the cursor, like dust in
 * zero gravity. Canvas-based so it stays cheap at high particle counts.
 * Inert (ambient drift only, no cursor interaction) on touch devices and
 * fully disabled under prefers-reduced-motion. */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hasCursor = window.matchMedia("(pointer: fine)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    const mouse = { x: -9999, y: -9999 };
    let raf = 0;
    let visible = true;

    function seed() {
      const count = Math.max(30, Math.min(140, Math.floor((width * height) / 9000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.5 + 0.6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }

    function resize() {
      const rect = container!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function onMove(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }

    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    const REPEL_RADIUS = 110;
    const REPEL_STRENGTH = 26;

    function render() {
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x += width;
        if (p.x > width) p.x -= width;
        if (p.y < 0) p.y += height;
        if (p.y > height) p.y -= height;

        let dx = 0;
        let dy = 0;
        const distX = p.x - mouse.x;
        const distY = p.y - mouse.y;
        const dist = Math.sqrt(distX * distX + distY * distY);
        if (dist < REPEL_RADIUS && dist > 0.01) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
          dx = (distX / dist) * force;
          dy = (distY / dist) * force;
        }

        ctx!.beginPath();
        ctx!.arc(p.x + dx, p.y + dy, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = 0.5;
        ctx!.fill();
      }
      raf = requestAnimationFrame(render);
    }

    function onVisibility() {
      visible = document.visibilityState === "visible";
      if (visible && !raf) raf = requestAnimationFrame(render);
      if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    resize();
    raf = requestAnimationFrame(render);

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    if (hasCursor) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseleave", onLeave);
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
    />
  );
}
