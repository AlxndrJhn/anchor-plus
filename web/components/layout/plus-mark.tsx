"use client";

import {
  EyeOff,
  Flame,
  GripVertical,
  Images,
  Lock,
  Palette,
  ScanText,
  Snowflake,
} from "lucide-react";
import * as React from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** What a click sends out: a few of the things Anchor+ adds. */
export const FEATURES = [
  Lock,
  Snowflake,
  EyeOff,
  ScanText,
  Palette,
  GripVertical,
  Flame,
  Images,
];

// One hover cycle; the sparks go round once in two. It hovers for as long as
// it shows.
const HOVER_MS = 3200;
const BURST_MS = 1400;
// The sparks and the burst reach past the cross, so the canvas is wider than
// the box the wordmark leaves for it.
const CANVAS_SCALE = 3;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * The "+" of Anchor+, set after the name: it hovers, glows, and
 * has a few sparks circling it, for everything the + adds. A click sends the
 * features out around it, as they do once when it first shows. Sits still
 * with reduced motion.
 */
export function PlusMark({
  size,
  isBurstOnShow = true,
  className,
}: {
  /** The height of the cross, about the cap height of the name next to it. */
  size: number;
  /** Plays the features once when it first shows; off where it shows often,
   * like the sidebar, so only a click plays them there. */
  isBurstOnShow?: boolean;
  className?: string;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const featureRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  // Where the hover and burst started, in performance.now() time.
  const hoverStart = React.useRef<number | null>(null);
  const burstStart = React.useRef<number | null>(null);
  const frame = React.useRef(0);
  const phase = React.useRef(0);

  const paint = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const side = size * CANVAS_SCALE;
    const pixels = Math.round(side * ratio);
    if (canvas.width !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, side, side);
    const style = getComputedStyle(canvas);
    paintPlus(
      ctx,
      size,
      side / 2,
      phase.current,
      style.getPropertyValue("--accent-strong").trim(),
      style.getPropertyValue("--accent-ink").trim(),
    );
  }, [size]);

  const placeFeatures = React.useCallback(
    (value: number | null) => {
      const count = FEATURES.length;
      featureRefs.current.forEach((el, index) => {
        if (!el) return;
        if (value === null) {
          el.style.visibility = "hidden";
          return;
        }
        const progress = easeOutCubic(value);
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
        const reach = size * 2.2 * progress;
        const opacity = (1 - value) * Math.min(1, value * 6);
        el.style.visibility = "visible";
        el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
        el.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach}px) scale(${0.4 + 0.6 * progress})`;
      });
    },
    [size],
  );

  const tick = React.useCallback(() => {
    const now = performance.now();
    let isRunning = false;
    if (hoverStart.current !== null) {
      const elapsed = now - hoverStart.current;
      phase.current = (elapsed % HOVER_MS) / HOVER_MS;
      isRunning = true;
    }
    if (burstStart.current !== null) {
      const value = (now - burstStart.current) / BURST_MS;
      if (value >= 1) {
        burstStart.current = null;
        placeFeatures(null);
      } else {
        placeFeatures(Math.max(0, value));
        isRunning = true;
      }
    }
    paint();
    frame.current = isRunning ? requestAnimationFrame(tick) : 0;
  }, [paint, placeFeatures]);

  const run = React.useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  }, [tick]);

  React.useEffect(() => {
    paint();
    if (prefersReducedMotion()) return;
    hoverStart.current = performance.now();
    run();
    // Shows once what the + stands for, after the page has settled.
    const firstBurst = isBurstOnShow
      ? window.setTimeout(() => {
          burstStart.current = performance.now();
          run();
        }, 900)
      : undefined;
    return () => {
      window.clearTimeout(firstBurst);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [paint, run, isBurstOnShow]);

  // Repaints at rest when the theme or colour scheme changes.
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!frame.current) paint();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-scheme", "style"],
    });
    return () => observer.disconnect();
  }, [paint]);

  const celebrate = (e: React.MouseEvent) => {
    // Inside the sidebar's link, so the click plays here instead.
    e.preventDefault();
    e.stopPropagation();
    if (prefersReducedMotion()) return;
    burstStart.current = performance.now();
    hoverStart.current ??= performance.now();
    run();
  };

  return (
    <span
      aria-hidden
      onClick={celebrate}
      className={cn(
        "relative inline-block flex-none cursor-pointer",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: size * CANVAS_SCALE, height: size * CANVAS_SCALE }}
      />
      {FEATURES.map((Icon, index) => (
        <span
          key={index}
          ref={(el) => {
            featureRefs.current[index] = el;
          }}
          className="pointer-events-none invisible absolute top-1/2 left-1/2 text-accent-ink"
        >
          <Icon size={size * 0.7} strokeWidth={2.25} />
        </span>
      ))}
    </span>
  );
}

/** The cross, its glow and its sparks, centred on (mid, mid + lift). */
function paintPlus(
  ctx: CanvasRenderingContext2D,
  side: number,
  mid: number,
  phase: number,
  accent: string,
  ink: string,
) {
  const lift = Math.sin(phase * 2 * Math.PI) * side * 0.09;
  const cx = mid;
  const cy = mid + lift;
  const wave = (Math.sin(phase * 2 * Math.PI) + 1) / 2;

  // The glow under the cross breathes as it rises.
  const glowRadius = side * 0.95;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
  glow.addColorStop(0, withAlpha(ctx, accent, 0.28 + 0.14 * wave));
  glow.addColorStop(1, withAlpha(ctx, accent, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRadius, 0, 2 * Math.PI);
  ctx.fill();

  // Three sparks on a tilted ring: the ones behind are drawn first, smaller
  // and fainter.
  const tilt = -0.5;
  const sparks: [number, number, number][] = [];
  for (let i = 0; i < 3; i++) {
    const a = (phase / 2 + i / 3) * 2 * Math.PI;
    const depth = Math.sin(a);
    const rx = Math.cos(a) * side * 0.95;
    const ry = depth * side * 0.32;
    sparks.push([
      depth,
      cx + rx * Math.cos(tilt) - ry * Math.sin(tilt),
      cy + rx * Math.sin(tilt) + ry * Math.cos(tilt),
    ]);
  }
  sparks.sort((a, b) => a[0] - b[0]);
  const spark = ([depth, x, y]: [number, number, number]) => {
    const near = (depth + 1) / 2;
    ctx.fillStyle = withAlpha(ctx, ink, 0.35 + 0.65 * near);
    ctx.beginPath();
    ctx.arc(x, y, side * (0.05 + 0.05 * near), 0, 2 * Math.PI);
    ctx.fill();
  };
  for (const s of sparks) if (s[0] < 0) spark(s);

  // The cross: rounded bars with a light running across them.
  const bar = side * 0.24;
  const arm = side * 0.5;
  const sweep = phase * 3 - 1;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const light = ctx.createLinearGradient(
    cx - arm,
    cy - arm,
    cx + arm,
    cy + arm,
  );
  light.addColorStop(0, ink);
  light.addColorStop(clamp(sweep - 0.25), accent);
  light.addColorStop(clamp(sweep), "#ffffff");
  light.addColorStop(clamp(sweep + 0.25), accent);
  light.addColorStop(1, ink);
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.roundRect(cx - arm, cy - bar / 2, arm * 2, bar, bar / 2);
  ctx.roundRect(cx - bar / 2, cy - arm, bar, arm * 2, bar / 2);
  ctx.fill();

  for (const s of sparks) if (s[0] >= 0) spark(s);
}

/** A colour at the given opacity, read back through the canvas so any CSS
 * colour a theme sets comes out as #rrggbb or rgba(). */
function withAlpha(
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
) {
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  const parsed = String(ctx.fillStyle);
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(parsed);
  if (hex) {
    const [r, g, b] = hex.slice(1).map((h) => Number.parseInt(h, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgba = /^rgba?\(([^,]+),([^,]+),([^,)]+)(?:,([^)]+))?\)$/.exec(parsed);
  if (rgba) {
    const base = rgba[4] === undefined ? 1 : Number(rgba[4]);
    return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${base * alpha})`;
  }
  return parsed;
}
