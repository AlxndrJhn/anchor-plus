"use client";

import { LoaderCircle, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import {
  MAX_DURATION_MS,
  RECORDER_ATTRIBUTE,
  stopDebugRecording,
  useDebugRecorder,
} from "../recorder";

const SIZE = 44;
const STROKE = 2.5;

/**
 * The camera in the top left corner while filming, as on Android: a red
 * dot, a ring for the time left, and a click to stop. It isn't filmed.
 */
export function RecordingButton() {
  const t = useTranslations("debugRecorder");
  const status = useDebugRecorder((s) => s.status);
  const startedAt = useDebugRecorder((s) => s.startedAt);
  const ring = React.useRef<SVGCircleElement>(null);

  React.useEffect(() => {
    if (status !== "recording") return;
    let frame = 0;
    const tick = () => {
      const left = Math.max(
        0,
        1 - (performance.now() - startedAt) / MAX_DURATION_MS,
      );
      ring.current?.style.setProperty("stroke-dashoffset", String(1 - left));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [status, startedAt]);

  if (status !== "recording" && status !== "finishing") return null;
  const finishing = status === "finishing";
  const r = (SIZE - 4 - STROKE) / 2;
  return (
    <div
      {...{ [RECORDER_ATTRIBUTE]: "" }}
      className="fixed top-[max(8px,env(safe-area-inset-top))] left-[max(8px,env(safe-area-inset-left))] z-[2147483000]"
    >
      <span role="status" className="sr-only">
        {finishing ? t("finishing") : t("recordingStatus")}
      </span>
      <button
        type="button"
        aria-label={t("stop")}
        title={t("stop")}
        disabled={finishing}
        onClick={() => void stopDebugRecording()}
        className="relative grid cursor-pointer place-items-center rounded-full bg-card text-foreground shadow-menu transition-transform active:scale-95 disabled:cursor-default"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg
          aria-hidden
          className="absolute inset-0.5 -rotate-90"
          viewBox={`0 0 ${SIZE - 4} ${SIZE - 4}`}
        >
          <circle
            ref={ring}
            cx={(SIZE - 4) / 2}
            cy={(SIZE - 4) / 2}
            r={r}
            fill="none"
            stroke="var(--destructive)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
          />
        </svg>
        {finishing ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
        ) : (
          <>
            <Video aria-hidden className="size-5" />
            <span
              aria-hidden
              className="absolute top-2.25 right-2.25 size-2 animate-pulse rounded-full bg-destructive"
            />
          </>
        )}
      </button>
    </div>
  );
}
