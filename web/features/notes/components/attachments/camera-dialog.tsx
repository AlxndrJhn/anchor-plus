"use client";

import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { translate } from "@/lib/i18n";
import { listCameras } from "../../live-hub";

const stopAll = (stream: MediaStream | null) => {
  for (const track of stream?.getTracks() ?? []) track.stop();
};

/** A JPEG of the video's current frame. */
async function snap(video: HTMLVideoElement): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  if (!canvas.width || !canvas.height) return null;
  canvas.getContext("2d")?.drawImage(video, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return new File(
    [blob],
    `${translate("noteEditor.attachments.camera")("fileName", { stamp })}.jpg`,
    { type: "image/jpeg" },
  );
}

/**
 * Takes a picture with a camera of this device, as the Android app's Take
 * picture does; with [several], keeps taking them until Done.
 */
export function CameraDialog({
  open,
  several,
  onClose,
  onPicture,
}: {
  open: boolean;
  several: boolean;
  onClose: () => void;
  onPicture: (file: File) => void;
}) {
  const t = useTranslations("noteEditor.attachments.camera");
  const tc = useTranslations("common");
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [cameras, setCameras] = React.useState<MediaDeviceInfo[]>([]);
  const [camera, setCamera] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const [taken, setTaken] = React.useState(0);
  const [flash, setFlash] = React.useState(false);
  const preview = React.useRef<HTMLVideoElement>(null);
  const kept = React.useRef<MediaStream | null>(null);
  kept.current = stream;

  const turnOn = React.useCallback(
    async (cameraId?: string) => {
      stopAll(kept.current);
      setStream(null);
      setError(null);
      try {
        const opened = await navigator.mediaDevices.getUserMedia({
          video: {
            ...(cameraId
              ? { deviceId: { exact: cameraId } }
              : { facingMode: { ideal: "environment" } }),
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        setStream(opened);
        setCamera(opened.getVideoTracks()[0]?.getSettings().deviceId);
        setCameras(await listCameras());
      } catch (e) {
        const refused =
          e instanceof DOMException && e.name === "NotAllowedError";
        setError(refused ? t("denied") : t("unavailable"));
      }
    },
    [t],
  );

  React.useEffect(() => {
    if (open) {
      setTaken(0);
      void turnOn();
      return;
    }
    stopAll(kept.current);
    setStream(null);
  }, [open, turnOn]);
  React.useEffect(() => () => stopAll(kept.current), []);
  React.useEffect(() => {
    if (preview.current) preview.current.srcObject = stream;
  }, [stream]);

  const take = async () => {
    const video = preview.current;
    const file = video && (await snap(video));
    if (!file) return;
    onPicture(file);
    if (!several) {
      onClose();
      return;
    }
    setTaken((n) => n + 1);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 150);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{several ? t("titleSeveral") : t("title")}</DialogTitle>
          <DialogDescription>
            {several ? t("descriptionSeveral") : t("description")}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {cameras.length > 1 && (
            <Field label={t("camera")}>
              <select
                className="h-9 w-full rounded-md border border-input bg-card px-2 text-ui"
                value={camera ?? ""}
                onChange={(e) => void turnOn(e.target.value)}
              >
                {cameras.map((c, i) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || t("cameraN", { n: i + 1 })}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="live-preview" style={{ opacity: flash ? 0.4 : 1 }}>
            {stream ? (
              <video ref={preview} muted autoPlay playsInline />
            ) : (
              <span>{error ?? t("starting")}</span>
            )}
          </div>
          {error && (
            <Button
              type="button"
              variant="secondary"
              className="justify-self-start"
              onClick={() => void turnOn(camera)}
            >
              {tc("retry")}
            </Button>
          )}
        </DialogBody>
        <DialogFooter>
          {several && taken > 0 && (
            <span className="mr-auto self-center text-meta text-muted-foreground">
              {t("added", { count: taken })}
            </span>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            {several && taken > 0 ? tc("done") : tc("cancel")}
          </Button>
          <Button type="button" disabled={!stream} onClick={() => void take()}>
            <Camera />
            {t("title")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
