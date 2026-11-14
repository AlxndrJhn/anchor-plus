"use client";

import {
  CircleAlert,
  Download,
  File as FileIcon,
  Pause,
  Play,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { cn } from "@/lib/utils";
import { fetchAttachmentBlob } from "../../api";
import { useAttachmentBlob } from "../../hooks/use-attachment-blob";
import type { NoteAttachment } from "../../types";

export type Kind = "image" | "audio" | "file";

export interface Upload {
  key: string;
  file: File;
  kind: Kind;
  preview: string | null;
  /** 0 to 1, or null while the browser can't tell. */
  progress: number | null;
  failed: boolean;
  controller: AbortController;
}

const formatTime = (seconds: number) =>
  Number.isFinite(seconds)
    ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
    : "0:00";

function Ring({ progress, label }: { progress: number | null; label: string }) {
  return (
    <span
      className="t-ring"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress == null ? undefined : Math.round(progress * 100)}
      data-unknown={progress == null || undefined}
      style={{ "--done": progress ?? 0.25 } as React.CSSProperties}
    >
      <svg viewBox="0 0 20 20" aria-hidden>
        <circle className="track" cx="10" cy="10" r="7.5" />
        <circle
          className="done"
          cx="10"
          cy="10"
          r="7.5"
          transform="rotate(-90 10 10)"
        />
      </svg>
    </span>
  );
}

interface TileProps {
  noteId: string;
  attachment: NoteAttachment;
  moving: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onDelete?: () => void;
}

export function PictureTile({
  noteId,
  attachment,
  moving,
  onPointerDown,
  onKeyDown,
  onDelete,
  onOpen,
}: TileProps & { onOpen: () => void }) {
  const t = useTranslations("noteEditor.attachments.tiles");
  const { blobUrl, error, retry } = useAttachmentBlob(noteId, attachment.id);
  const [isArriving] = React.useState(!blobUrl);
  const state = error ? "failed" : blobUrl ? "ready" : "loading";
  return (
    <div
      className={cn("att-tile", `st-${state}`)}
      data-flip={attachment.id}
      data-id={attachment.id}
      data-group="image"
      data-moving={moving || undefined}
      onPointerDown={onPointerDown}
    >
      <button
        type="button"
        className="t-open"
        aria-label={t("openViewer", { name: attachment.originalFilename })}
        disabled={state !== "ready"}
        onClick={onOpen}
        onKeyDown={onKeyDown}
      />
      {blobUrl && (
        <img
          className={cn("th", isArriving && "animate-fade-in")}
          src={blobUrl}
          alt=""
          draggable={false}
        />
      )}
      <div className="shimmer" />
      <div className="t-fail">
        <CircleAlert aria-hidden />
        <button
          type="button"
          onClick={retry}
          aria-label={t("retryNamed", { name: attachment.originalFilename })}
        >
          {t("retry")}
        </button>
      </div>
      {onDelete && (
        <button
          type="button"
          className="t-x"
          aria-label={t("delete", { name: attachment.originalFilename })}
          onClick={onDelete}
        >
          <X aria-hidden />
        </button>
      )}
    </div>
  );
}

export function VoiceCard({
  noteId,
  attachment,
  moving,
  onPointerDown,
  onKeyDown,
  onDelete,
}: TileProps) {
  const t = useTranslations("noteEditor.attachments.tiles");
  const { blobUrl, error, retry } = useAttachmentBlob(noteId, attachment.id);
  const audio = React.useRef<HTMLAudioElement>(null);
  const bar = React.useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const state = error ? "failed" : blobUrl ? "ready" : "loading";
  const played = duration ? Math.min(1, position / duration) : 0;
  const name = attachment.originalFilename;

  const seek = (seconds: number) => {
    const el = audio.current;
    if (!el || !duration) return;
    el.currentTime = Math.max(0, Math.min(duration, seconds));
    setPosition(el.currentTime);
  };
  const seekTo = (x: number) => {
    const rect = bar.current?.getBoundingClientRect();
    if (rect) seek(((x - rect.left) / rect.width) * duration);
  };
  const measure = (el: HTMLAudioElement) =>
    setDuration(Number.isFinite(el.duration) ? el.duration : 0);

  return (
    <div
      className={cn("att-audio", `st-${state}`, playing && "playing")}
      data-flip={attachment.id}
      data-id={attachment.id}
      data-group="audio"
      data-moving={moving || undefined}
      style={{ "--p": `${played * 100}%` } as React.CSSProperties}
      onPointerDown={onPointerDown}
    >
      {blobUrl && (
        <audio
          ref={audio}
          src={blobUrl}
          preload="metadata"
          onLoadedMetadata={(e) => measure(e.currentTarget)}
          onDurationChange={(e) => measure(e.currentTarget)}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
          onPlay={(e) => {
            for (const other of document.querySelectorAll("audio"))
              if (other !== e.currentTarget) other.pause();
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
      <div className="aa-top">
        <button
          type="button"
          className="play"
          aria-label={t(playing ? "pause" : "play", { name })}
          disabled={state !== "ready"}
          onClick={() =>
            playing ? audio.current?.pause() : void audio.current?.play()
          }
          onKeyDown={onKeyDown}
        >
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </button>
        <div className="aa-meta">
          <span className="aa-name" title={name}>
            {name}
          </span>
          <span className="a-time">
            {formatTime(position)}
            {duration ? ` / ${formatTime(duration)}` : ""}
          </span>
          <span className="a-fail">
            {t("couldntLoad")}
            <button
              type="button"
              onClick={retry}
              aria-label={t("retryNamed", { name })}
            >
              {t("retry")}
            </button>
          </span>
        </div>
      </div>
      <div
        ref={bar}
        className="a-bar"
        role="slider"
        tabIndex={state === "ready" ? 0 : -1}
        aria-disabled={state !== "ready" || undefined}
        aria-label={t("position", { name })}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={t("positionText", {
          position: formatTime(position),
          duration: formatTime(duration),
        })}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seekTo(e.clientX);
        }}
        onPointerMove={(e) =>
          e.currentTarget.hasPointerCapture(e.pointerId) && seekTo(e.clientX)
        }
        // Left and Right move along the attachments row.
        onKeyDown={(e) => {
          const step = { ArrowUp: 5, ArrowDown: -5 }[e.key];
          if (e.key === "Home") seek(0);
          else if (e.key === "End") seek(duration);
          else if (step && !e.altKey) seek(position + step);
          else return;
          e.preventDefault();
        }}
      >
        <span className="a-fill" />
        <span className="a-knob" />
      </div>
      {blobUrl && (
        <a
          className="t-x t-dl"
          href={blobUrl}
          download={name}
          aria-label={t("download", { name })}
          title={t("downloadTitle")}
          data-beside={onDelete ? "" : undefined}
        >
          <Download aria-hidden />
        </a>
      )}
      {onDelete && (
        <button
          type="button"
          className="t-x"
          aria-label={t("delete", { name })}
          onClick={onDelete}
        >
          <X aria-hidden />
        </button>
      )}
    </div>
  );
}

/** “820 KB”, “3.4 MB”. */
export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Any other file: its name and size, and a button that downloads it. */
export function FileCard({
  noteId,
  attachment,
  moving,
  onPointerDown,
  onKeyDown,
  onDelete,
}: TileProps) {
  const t = useTranslations("noteEditor.attachments.tiles");
  const [state, setState] = React.useState<"ready" | "loading" | "failed">(
    "ready",
  );
  const name = attachment.originalFilename;

  const download = async () => {
    setState("loading");
    try {
      const blob = await fetchAttachmentBlob(noteId, attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setState("ready");
    } catch {
      setState("failed");
    }
  };

  return (
    <div
      className={cn("att-audio att-file", `st-${state}`)}
      data-flip={attachment.id}
      data-id={attachment.id}
      data-group="file"
      data-moving={moving || undefined}
      onPointerDown={onPointerDown}
    >
      <div className="aa-top">
        <button
          type="button"
          className="play"
          aria-label={t("download", { name })}
          disabled={state === "loading"}
          onClick={() => void download()}
          onKeyDown={onKeyDown}
        >
          {state === "loading" ? (
            <FileIcon aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
        </button>
        <div className="aa-meta">
          <span className="aa-name" title={name}>
            {name}
          </span>
          <span className="a-time">{fileSize(attachment.fileSize)}</span>
          <span className="a-fail">
            {t("couldntDownload")}
            <button
              type="button"
              onClick={() => void download()}
              aria-label={t("retryNamed", { name })}
            >
              {t("retry")}
            </button>
          </span>
        </div>
      </div>
      {onDelete && (
        <button
          type="button"
          className="t-x"
          aria-label={t("delete", { name })}
          onClick={onDelete}
        >
          <X aria-hidden />
        </button>
      )}
    </div>
  );
}

export function UploadTile({
  upload,
  onRetry,
  onCancel,
}: {
  upload: Upload;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("noteEditor.attachments.tiles");
  const name = upload.file.name;
  const cancelButton = (
    <button
      type="button"
      className="t-x"
      aria-label={t(upload.failed ? "remove" : "cancel", { name })}
      onClick={onCancel}
    >
      <X aria-hidden />
    </button>
  );
  if (upload.kind !== "image")
    return (
      <div
        className={cn(
          "att-audio",
          upload.kind === "file" && "att-file",
          upload.failed ? "st-failed" : "st-uploading",
        )}
        data-flip={upload.key}
        data-group={upload.kind}
        data-upload
        style={
          { "--p": `${(upload.progress ?? 0) * 100}%` } as React.CSSProperties
        }
      >
        <div className="aa-top">
          <span className="play" aria-hidden>
            {upload.kind === "file" ? <FileIcon /> : <Play />}
          </span>
          <div className="aa-meta">
            <span className="aa-name">{name}</span>
            <span className="a-time">{t("uploading")}</span>
          </div>
        </div>
        <div
          className="a-bar"
          data-unknown={upload.progress == null || undefined}
        >
          <span className="a-fill" />
        </div>
        <span className="a-fail">
          {t("couldntUpload")}
          <button
            type="button"
            onClick={onRetry}
            aria-label={t("retryNamed", { name })}
          >
            {t("retry")}
          </button>
        </span>
        {cancelButton}
      </div>
    );
  return (
    <div
      className={cn("att-tile", upload.failed ? "st-failed" : "st-uploading")}
      data-flip={upload.key}
      data-group="image"
      data-upload
    >
      {upload.preview && (
        <img className="th" src={upload.preview} alt="" draggable={false} />
      )}
      <Ring progress={upload.progress} label={t("uploadingName", { name })} />
      <div className="t-fail">
        <CircleAlert aria-hidden />
        <button
          type="button"
          onClick={onRetry}
          aria-label={t("retryNamed", { name })}
        >
          {t("retry")}
        </button>
      </div>
      {cancelButton}
    </div>
  );
}
