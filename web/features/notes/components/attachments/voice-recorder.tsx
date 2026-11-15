"use client";

import { Mic, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { translate } from "@/lib/i18n";

/** Formats browsers record in, best first; all are accepted attachments. */
const FORMATS = [
  { mime: "audio/webm;codecs=opus", type: "audio/webm", ext: "webm" },
  { mime: "audio/webm", type: "audio/webm", ext: "webm" },
  { mime: "audio/mp4", type: "audio/mp4", ext: "m4a" },
  { mime: "audio/ogg;codecs=opus", type: "audio/ogg", ext: "ogg" },
];

export function canRecordAudio() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

type Phase = "asking" | "recording" | "denied" | "failed";

const stopTracks = (stream: MediaStream | null) => {
  for (const track of stream?.getTracks() ?? []) track.stop();
};

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Records a voice memo, like the Android app's recorder sheet. */
export function VoiceRecorder({
  onRecorded,
  onClose,
}: {
  onRecorded: (file: File) => void;
  onClose: () => void;
}) {
  const t = useTranslations("noteEditor.attachments.voice");
  const tc = useTranslations("common");
  const [phase, setPhase] = React.useState<Phase>("asking");
  const [seconds, setSeconds] = React.useState(0);
  const recorder = React.useRef<MediaRecorder | null>(null);
  const keep = React.useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: records once per opening
  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let gone = false;
    const chunks: Blob[] = [];
    const format =
      FORMATS.find((f) => MediaRecorder.isTypeSupported(f.mime)) ?? FORMATS[0];

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((media) => {
        stream = media;
        if (gone) return stopTracks(media);
        const rec = new MediaRecorder(media, { mimeType: format.mime });
        recorder.current = rec;
        rec.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        rec.onstop = () => {
          stopTracks(media);
          if (!keep.current || !chunks.length) return;
          const stamp = new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/[T:]/g, "-");
          onRecorded(
            new File(
              chunks,
              `${translate("noteEditor.attachments.voice")("fileName", { stamp })}.${format.ext}`,
              {
                type: format.type,
              },
            ),
          );
        };
        rec.start(250);
        setPhase("recording");
        const started = Date.now();
        timer = window.setInterval(
          () => setSeconds(Math.floor((Date.now() - started) / 1000)),
          250,
        );
      })
      .catch((error: unknown) => {
        if (gone) return;
        setPhase(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "denied"
            : "failed",
        );
      });

    return () => {
      gone = true;
      window.clearInterval(timer);
      if (recorder.current?.state === "recording") recorder.current.stop();
      else stopTracks(stream);
    };
  }, []);

  const stop = () => {
    keep.current = true;
    recorder.current?.stop();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md">
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t(phase)}</DialogDescription>
        <DialogBody className="grid place-items-center py-4">
          <span
            className="flex items-center gap-2 font-semibold text-heading tabular-nums"
            aria-live="off"
          >
            <Mic
              aria-hidden
              className={
                phase === "recording"
                  ? "size-5 animate-pulse text-late"
                  : "size-5 text-muted-foreground"
              }
            />
            {clock(seconds)}
          </span>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button onClick={stop} disabled={phase !== "recording"}>
            <Square aria-hidden />
            {t("stop")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
