"use client";

import { useEffect, useRef } from "react";

const SPACING = 32;
const DOT_RADIUS = 1.4;
const GLOW_RADIUS = 160;
const EASE = 0.12;

type Dot = { x: number; y: number; intensity: number };

function blend(t: number) {
  const r = Math.round(232 + (108 - 232) * t);
  const g = Math.round(232 + (99 - 232) * t);
  const b = Math.round(232 + (255 - 232) * t);
  return `${r}, ${g}, ${b}`;
}

export default function HeroDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    let frameId = 0;
    const mouse = { x: -9999, y: -9999, active: false };

    function buildGrid() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.scale(dpr, dpr);

      dots = [];
      for (let y = SPACING / 2; y < height; y += SPACING) {
        for (let x = SPACING / 2; x < width; x += SPACING) {
          dots.push({ x, y, intensity: 0 });
        }
      }
    }

    function renderStatic() {
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = "rgba(232, 232, 232, 0.18)";
      for (const dot of dots) {
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      for (const dot of dots) {
        const dx = dot.x - mouse.x;
        const dy = dot.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const target = mouse.active ? Math.max(0, 1 - dist / GLOW_RADIUS) : 0;
        dot.intensity += (target - dot.intensity) * EASE;

        const radius = DOT_RADIUS + dot.intensity * 2.4;
        const opacity = 0.18 + dot.intensity * 0.82;

        ctx!.beginPath();
        if (dot.intensity > 0.04) {
          ctx!.shadowColor = `rgba(108, 99, 255, ${dot.intensity})`;
          ctx!.shadowBlur = 14 * dot.intensity;
        } else {
          ctx!.shadowBlur = 0;
        }
        ctx!.fillStyle = `rgba(${blend(dot.intensity)}, ${opacity})`;
        ctx!.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      frameId = requestAnimationFrame(draw);
    }

    function handlePointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        mouse.active = false;
        return;
      }
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;
    }

    buildGrid();

    const resizeObserver = new ResizeObserver(() => {
      buildGrid();
      if (reducedMotion) renderStatic();
    });
    resizeObserver.observe(canvas);

    if (reducedMotion) {
      renderStatic();
    } else {
      window.addEventListener("pointermove", handlePointerMove);
      frameId = requestAnimationFrame(draw);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
