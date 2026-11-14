"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  addPatternDot,
  PATTERN_GRID_SIZE,
  patternDotAt,
  patternDotCentre,
} from "../../note-lock";

const SIZE = PATTERN_GRID_SIZE;
const centre = patternDotCentre;

/**
 * A 3×3 grid of dots to draw a pattern across, with a finger or the mouse.
 * `onDone` gets the dots joined, as digits 0 to 8; answering false shows the
 * pattern as wrong for a moment.
 */
export function PatternPad({
  onDone,
  disabled,
  label,
  className,
}: {
  onDone: (
    pattern: string,
  ) => boolean | undefined | Promise<boolean | undefined>;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("noteEditor.lock.pattern");
  const ref = React.useRef<SVGSVGElement>(null);
  const [path, setPath] = React.useState<number[]>([]);
  const [pointer, setPointer] = React.useState<{ x: number; y: number } | null>(
    null,
  );
  const [wrong, setWrong] = React.useState(false);
  const drawing = React.useRef(false);
  const pathRef = React.useRef<number[]>([]);
  const clearTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(clearTimer.current), []);

  const toGrid = (e: React.PointerEvent) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box?.width) return { x: -1, y: -1 };
    return {
      x: ((e.clientX - box.left) / box.width) * SIZE,
      y: ((e.clientY - box.top) / box.height) * SIZE,
    };
  };
  const track = (e: React.PointerEvent) => {
    const at = toGrid(e);
    setPointer(at);
    const dot = patternDotAt(at.x, at.y);
    if (dot === null) return;
    const next = addPatternDot(pathRef.current, dot);
    if (next === pathRef.current) return;
    pathRef.current = next;
    setPath(next);
  };
  const finish = async () => {
    if (!drawing.current) return;
    drawing.current = false;
    setPointer(null);
    const drawn = pathRef.current;
    if (!drawn.length) return;
    const ok = await onDone(drawn.join(""));
    if (ok === false) {
      setWrong(true);
      window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(() => {
        setWrong(false);
        pathRef.current = [];
        setPath([]);
      }, 900);
    } else {
      pathRef.current = [];
      setPath([]);
    }
  };

  const last = path.length ? centre(path[path.length - 1]) : null;
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={t("label", { label: label ?? t("default") })}
      data-wrong={wrong ? "" : undefined}
      className={cn(
        "pattern-pad aspect-square w-full max-w-60 touch-none select-none",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onPointerDown={(e) => {
        if (disabled || e.button > 0) return;
        e.preventDefault();
        window.clearTimeout(clearTimer.current);
        setWrong(false);
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        pathRef.current = [];
        setPath([]);
        track(e);
      }}
      onPointerMove={(e) => drawing.current && track(e)}
      onPointerUp={() => void finish()}
      onPointerCancel={() => void finish()}
    >
      {path.length > 1 && (
        <polyline
          className="pattern-line"
          points={path
            .map((dot) => {
              const c = centre(dot);
              return `${c.x},${c.y}`;
            })
            .join(" ")}
        />
      )}
      {last && pointer && (
        <line
          className="pattern-line"
          x1={last.x}
          y1={last.y}
          x2={pointer.x}
          y2={pointer.y}
        />
      )}
      {Array.from({ length: 9 }, (_, dot) => {
        const c = centre(dot);
        const on = path.includes(dot);
        return (
          <g key={dot} data-on={on ? "" : undefined} className="pattern-dot">
            <circle cx={c.x} cy={c.y} r={26} className="pattern-halo" />
            <circle cx={c.x} cy={c.y} r={9} />
          </g>
        );
      })}
    </svg>
  );
}
