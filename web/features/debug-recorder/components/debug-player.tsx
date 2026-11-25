"use client";

import { Download, Flag, Pause, Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { RECORDER_ATTRIBUTE } from "../recorder";
import {
  buildDebugReport,
  type DebugProblem,
  type DebugRecording,
  debugIssueUrl,
  debugReportFilename,
  debugSummary,
  formatVideoTime,
} from "../report";

/**
 * Plays a recording back, for marking where things went wrong, then saves
 * it as one MP4 with everything in it, or opens a GitHub issue for it.
 */
export function DebugPlayer({
  recording,
  onDone,
}: {
  recording: DebugRecording;
  onDone: () => void;
}) {
  const t = useTranslations("debugRecorder");
  const duration = Math.max(1, recording.durationMs);
  const [problems, setProblems] = React.useState<DebugProblem[]>([]);
  const [position, setPosition] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [marking, setMarking] = React.useState<number | null>(null);
  const [expectation, setExpectation] = React.useState("");
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [showContents, setShowContents] = React.useState(false);
  const video = React.useRef<HTMLVideoElement>(null);
  // Where play starts from, read once when it does.
  const positionRef = React.useRef(0);
  positionRef.current = position;

  // H.264 plays in a <video>: the report itself, before problems are added.
  // JPEG frames show one by one.
  const [source, setSource] = React.useState<string | null>(null);
  const [frames, setFrames] = React.useState<{ tMs: number; url: string }[]>(
    [],
  );
  React.useEffect(() => {
    const blob = (data: Uint8Array, type: string) =>
      URL.createObjectURL(new Blob([data as BlobPart], { type }));
    if (recording.video.kind === "h264") {
      const url = blob(buildDebugReport(recording, []), "video/mp4");
      setSource(url);
      return () => URL.revokeObjectURL(url);
    }
    const list = recording.video.samples.map((s) => ({
      tMs: s.tMs,
      url: blob(s.data, "image/jpeg"),
    }));
    setFrames(list);
    return () => {
      for (const f of list) URL.revokeObjectURL(f.url);
    };
  }, [recording]);

  // While playing, follow the video, or run a clock for the frames.
  React.useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const from = performance.now();
    const at = positionRef.current;
    const start = at >= duration ? 0 : at;
    const tick = () => {
      const now = video.current
        ? video.current.currentTime * 1000
        : start + performance.now() - from;
      setPosition(Math.min(now, duration));
      if (now >= duration || video.current?.ended) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);

  const seek = (ms: number) => {
    const at = Math.max(0, Math.min(ms, duration));
    setPosition(at);
    if (video.current) video.current.currentTime = at / 1000;
  };

  const togglePlay = () => {
    if (playing) {
      video.current?.pause();
      setPlaying(false);
      return;
    }
    if (position >= duration - 50) seek(0);
    void video.current?.play();
    setPlaying(true);
  };

  const pause = () => {
    video.current?.pause();
    setPlaying(false);
  };

  const frameUrl = React.useMemo(() => {
    if (!frames.length) return null;
    let lo = 0;
    let hi = frames.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (frames[mid].tMs <= position) lo = mid;
      else hi = mid - 1;
    }
    return frames[lo].url;
  }, [frames, position]);

  const addProblem = () => {
    if (marking === null) return;
    setProblems((list) =>
      [...list, { tMs: marking, expectation: expectation.trim() }].sort(
        (a, b) => a.tMs - b.tMs,
      ),
    );
    setMarking(null);
    setExpectation("");
  };

  const close = () => {
    if (busy) return;
    if (problems.length) setConfirmDiscard(true);
    else onDone();
  };

  const save = () => {
    const name = debugReportFilename(recording.startedAt);
    const bytes = buildDebugReport(recording, problems);
    const url = URL.createObjectURL(
      new Blob([bytes as BlobPart], { type: "video/mp4" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return name;
  };

  const run = async (then?: (name: string) => void) => {
    pause();
    setBusy(true);
    try {
      // Let the busy state paint before the work blocks.
      await new Promise((r) => setTimeout(r, 30));
      const name = save();
      toast.success(t("saved", { name }));
      then?.(name);
      onDone();
    } catch {
      toast.error(t("buildFailed"));
    } finally {
      setBusy(false);
    }
  };

  const createIssue = () =>
    run((name) => {
      const url = debugIssueUrl({
        startedAt: recording.startedAt,
        problems,
        filename: name,
        appVersion: String(recording.app.version ?? ""),
      });
      window.open(url, "_blank", "noopener,noreferrer");
    });

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent
          size="lg"
          aria-describedby={undefined}
          {...{ [RECORDER_ATTRIBUTE]: "" }}
          className="md:w-[min(880px,100%)]"
          onEscapeKeyDown={(e) => {
            if (marking !== null) {
              e.preventDefault();
              setMarking(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="gap-3">
            <div
              className="relative max-h-[52vh] overflow-hidden rounded-lg bg-black shadow-[inset_0_0_0_1px_var(--border)]"
              style={{
                aspectRatio: `${recording.video.width} / ${recording.video.height}`,
              }}
            >
              {source ? (
                <video
                  ref={video}
                  src={source}
                  muted
                  playsInline
                  preload="auto"
                  className="size-full"
                  onClick={togglePlay}
                />
              ) : frameUrl ? (
                <img src={frameUrl} alt="" className="size-full" />
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <IconButton
                label={playing ? t("pause") : t("play")}
                onClick={togglePlay}
              >
                {playing ? <Pause /> : <Play />}
              </IconButton>
              <div className="relative flex-1">
                <input
                  type="range"
                  aria-label={t("position")}
                  aria-valuetext={formatVideoTime(position)}
                  min={0}
                  max={duration}
                  step={10}
                  value={Math.round(position)}
                  onChange={(e) => {
                    pause();
                    seek(Number(e.target.value));
                  }}
                  className="w-full accent-primary"
                />
                {problems.map((p) => (
                  <span
                    key={`${p.tMs}-${p.expectation}`}
                    aria-hidden
                    className="pointer-events-none absolute top-0 h-1.5 w-1 -translate-x-1/2 rounded-full bg-destructive"
                    style={{ left: `${(p.tMs / duration) * 100}%` }}
                  />
                ))}
              </div>
              <span className="w-28 shrink-0 text-right text-muted-foreground text-small tabular-nums">
                {formatVideoTime(position)} / {formatVideoTime(duration)}
              </span>
            </div>

            {marking === null ? (
              <Button
                variant="secondary"
                className="justify-self-center"
                onClick={() => {
                  pause();
                  setMarking(Math.round(position));
                }}
              >
                <Flag />
                {t("problemHere", { time: formatVideoTime(position) })}
              </Button>
            ) : (
              <form
                className="grid gap-2 rounded-lg bg-foreground/4 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  addProblem();
                }}
              >
                <label
                  htmlFor="debug-expectation"
                  className="font-semibold text-ui"
                >
                  {t("problemAt", { time: formatVideoTime(marking) })} ·{" "}
                  {t("expectation")}
                </label>
                <textarea
                  id="debug-expectation"
                  autoFocus
                  rows={2}
                  value={expectation}
                  maxLength={1000}
                  onChange={(e) => setExpectation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      addProblem();
                    }
                  }}
                  className="min-h-16 resize-y rounded-field bg-card px-3 py-2 text-ui shadow-[inset_0_0_0_1px_var(--input)] outline-none focus:shadow-[inset_0_0_0_2px_var(--ring)]"
                />
                <p className="m-0 text-muted-foreground text-small">
                  {t("expectationHint")}
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => setMarking(null)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit">{t("add")}</Button>
                </div>
              </form>
            )}

            {problems.length ? (
              <ul className="m-0 grid list-none gap-1 p-0">
                {problems.map((p, i) => (
                  <li
                    key={`${p.tMs}-${i}`}
                    className="flex items-center gap-2 rounded-md bg-foreground/4 py-1 pr-1 pl-2.5"
                  >
                    <Flag
                      aria-hidden
                      className="size-3.5 shrink-0 text-destructive"
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-pointer truncate bg-transparent text-left text-ui"
                      onClick={() => {
                        pause();
                        seek(p.tMs);
                      }}
                    >
                      <span className="font-semibold tabular-nums">
                        {formatVideoTime(p.tMs)}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {p.expectation || t("noExpectation")}
                      </span>
                    </button>
                    <IconButton
                      size="sm"
                      tone="danger"
                      label={t("removeProblem", {
                        time: formatVideoTime(p.tMs),
                      })}
                      onClick={() =>
                        setProblems((list) => list.filter((_, j) => j !== i))
                      }
                    >
                      <X />
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-center text-muted-foreground text-small">
                {t("problemsHint")}
              </p>
            )}

            <p className="m-0 text-muted-foreground text-small leading-normal">
              {t("privacy")}
            </p>
            <details
              className="text-small"
              onToggle={(e) => setShowContents(e.currentTarget.open)}
            >
              <summary className="cursor-pointer text-muted-foreground">
                {t("contents")}
              </summary>
              {showContents && (
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-foreground/4 p-2.5 font-mono text-[11px] leading-snug">
                  {JSON.stringify(debugSummary(recording, problems), null, 2)}
                </pre>
              )}
            </details>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="quiet"
              className="mr-auto max-md:mr-0"
              disabled={busy}
              onClick={close}
            >
              {t("discard")}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void run()}
            >
              <Download />
              {t("download")}
            </Button>
            <Button
              busy={busy && t("building")}
              onClick={() => void createIssue()}
            >
              {t("createIssue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        onConfirm={() => {
          setConfirmDiscard(false);
          onDone();
        }}
        title={t("discardTitle")}
        description={t("discardMessage")}
        confirmLabel={t("discard")}
      />
    </>
  );
}
