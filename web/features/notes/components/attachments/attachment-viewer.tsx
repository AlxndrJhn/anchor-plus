"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  LoaderCircle,
  ScanText,
  SquareArrowOutUpRight,
  Tags,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast, toastHostRef } from "@/components/ui/toast";
import {
  getPictureLabels,
  getPictureSearchStatus,
  type PictureLabel,
  pictureSearchStatusKey,
} from "@/features/picture-search/api";
import type { ImageText } from "@/lib/image-text";
import { useAttachmentBlob } from "../../hooks/use-attachment-blob";
import { usePictureZoom } from "../../hooks/use-picture-zoom";
import type { NoteAttachment } from "../../types";
import { ImageTextView } from "./image-text-view";

export function Viewer({
  noteId,
  pictures,
  id,
  onShow,
  canDelete,
  onDelete,
  onReturnFocus,
  onGrabText,
  noteHref,
}: {
  noteId: string;
  pictures: NoteAttachment[];
  id: string | null;
  onShow: (id: string | null) => void;
  canDelete: (a: NoteAttachment) => boolean;
  onDelete: (a: NoteAttachment) => void;
  /** True when it put focus back in the strip. */
  onReturnFocus: (pictureId: string) => boolean;
  /**
   * Takes text read from a picture into the note; absent when the note can't
   * be edited, which leaves copying it.
   */
  onGrabText?: (text: string) => void;
  /** Where the note opens, when the viewer was opened from outside it. */
  noteHref?: string;
}) {
  const t = useTranslations("noteEditor.attachments.viewer");
  const tc = useTranslations("common");
  // The last picture stays while the viewer fades out.
  const [last, setLast] = React.useState(id);
  if (id && id !== last) setLast(id);
  const index = pictures.findIndex((x) => x.id === (id ?? last));
  const picture = pictures[index];
  const { blobUrl, error, retry } = useAttachmentBlob(
    noteId,
    picture?.id ?? "",
  );
  const swipe = React.useRef<{ x: number; y: number } | null>(null);
  const zoom = usePictureZoom(picture?.id ?? "");

  const go = (step: number) => {
    if (pictures.length < 2) return;
    const next = pictures[(index + step + pictures.length) % pictures.length];
    onShow(next.id);
  };

  const [reading, setReading] = React.useState(false);
  // The text found in the shown picture, marked on it to pick from.
  const [found, setFound] = React.useState<{
    pictureId: string;
    text: ImageText;
  } | null>(null);
  if (found && found.pictureId !== picture?.id) setFound(null);

  const grabText = async () => {
    if (found) return setFound(null);
    if (!blobUrl || !picture) return;
    setReading(true);
    try {
      const { recognizeImageText } = await import("@/lib/image-text");
      const text = await recognizeImageText(blobUrl);
      if (!text.words.length) {
        toast.error(t("noText"));
        return;
      }
      setFound({ pictureId: picture.id, text });
    } catch {
      toast.error(navigator.onLine ? t("readFailed") : t("readOffline"));
    } finally {
      setReading(false);
    }
  };

  // What the picture search model sees in the shown picture, as words.
  const { data: pictureSearch } = useQuery({
    queryKey: pictureSearchStatusKey,
    queryFn: getPictureSearchStatus,
    staleTime: 60_000,
  });
  const [tags, setTags] = React.useState<{
    pictureId: string;
    labels: PictureLabel[];
  } | null>(null);
  const [findingTags, setFindingTags] = React.useState(false);
  if (tags && tags.pictureId !== picture?.id) setTags(null);

  const showTags = async () => {
    if (tags) return setTags(null);
    if (!picture) return;
    setFindingTags(true);
    try {
      const labels = await getPictureLabels(picture.id, navigator.language);
      if (!labels.length) {
        toast.error(t("notAnalyzed"));
        return;
      }
      setTags({ pictureId: picture.id, labels });
    } catch {
      toast.error(t("tagsFailed"));
    } finally {
      setFindingTags(false);
    }
  };

  const download = () => {
    if (!blobUrl || !picture) return;
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = picture.originalFilename;
    link.click();
  };

  return (
    <DialogPrimitive.Root
      open={!!id && !!picture}
      onOpenChange={(open) => !open && onShow(null)}
    >
      <DialogPrimitive.Portal>
        {picture && (
          <DialogPrimitive.Content
            ref={toastHostRef}
            className="viewer"
            aria-describedby={undefined}
            onCloseAutoFocus={(e) => {
              if (onReturnFocus(picture.id)) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              // Esc leaves the text first, then the viewer.
              if (!found) return;
              e.preventDefault();
              setFound(null);
            }}
            onKeyDown={(e) => {
              if (found) return;
              if (e.key === "ArrowLeft") go(-1);
              else if (e.key === "ArrowRight") go(1);
              else if (e.ctrlKey || e.metaKey || e.altKey) return;
              else if (e.key === "+" || e.key === "=") zoom.zoomIn();
              else if (e.key === "-" || e.key === "_") zoom.zoomOut();
              else if (e.key === "0") zoom.reset();
            }}
          >
            <div className="vw-top">
              <div>
                <DialogPrimitive.Title className="vw-name">
                  {picture.originalFilename}
                </DialogPrimitive.Title>
                <div className="vw-count">
                  {t("count", { index: index + 1, total: pictures.length })}
                </div>
              </div>
              <div className="vw-actions">
                {!found && (
                  <div className="vw-zoom">
                    <button
                      type="button"
                      aria-label={t("zoomOut")}
                      onClick={zoom.zoomOut}
                      disabled={!zoom.ready || !zoom.canZoomOut}
                    >
                      <ZoomOut aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="vw-pct"
                      aria-label={t("fit")}
                      title={t("fit")}
                      onClick={zoom.reset}
                      disabled={!zoom.ready || !zoom.zoomed}
                    >
                      {zoom.percent === null ? "–" : `${zoom.percent}%`}
                    </button>
                    <button
                      type="button"
                      aria-label={t("zoomIn")}
                      onClick={zoom.zoomIn}
                      disabled={!zoom.ready || !zoom.canZoomIn}
                    >
                      <ZoomIn aria-hidden />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  aria-label={t("grabImageText")}
                  aria-pressed={!!found}
                  onClick={grabText}
                  disabled={!blobUrl || reading}
                  aria-busy={reading || undefined}
                >
                  {reading ? (
                    <LoaderCircle aria-hidden className="animate-spin" />
                  ) : (
                    <ScanText aria-hidden />
                  )}
                  <span className="vw-lbl">
                    {reading ? t("reading") : t("grabText")}
                  </span>
                </button>
                {pictureSearch?.enabled && (
                  <button
                    type="button"
                    aria-label={tags ? t("hideTags") : t("showTags")}
                    aria-pressed={!!tags}
                    onClick={showTags}
                    disabled={findingTags}
                    aria-busy={findingTags || undefined}
                  >
                    {findingTags ? (
                      <LoaderCircle aria-hidden className="animate-spin" />
                    ) : (
                      <Tags aria-hidden />
                    )}
                    <span className="vw-lbl">{t("tags")}</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label={t("download")}
                  onClick={download}
                  disabled={!blobUrl}
                >
                  <Download aria-hidden />
                  <span className="vw-lbl">{t("download")}</span>
                </button>
                {canDelete(picture) && (
                  <button
                    type="button"
                    aria-label={tc("delete")}
                    onClick={() => onDelete(picture)}
                  >
                    <Trash2 aria-hidden />
                    <span className="vw-lbl">{tc("delete")}</span>
                  </button>
                )}
                {noteHref && (
                  <Link
                    href={noteHref}
                    className="vw-open"
                    aria-label={t("openNote")}
                    title={t("openNote")}
                    onClick={() => onShow(null)}
                  >
                    <SquareArrowOutUpRight aria-hidden />
                    <span className="vw-lbl">{t("openNote")}</span>
                  </Link>
                )}
                <DialogPrimitive.Close
                  className="vw-x"
                  aria-label={tc("close")}
                >
                  <X aria-hidden />
                </DialogPrimitive.Close>
              </div>
            </div>
            {found && blobUrl ? (
              <ImageTextView
                src={blobUrl}
                alt={picture.originalFilename}
                text={found.text}
                onInsert={
                  onGrabText &&
                  ((text) => {
                    onGrabText(text);
                    onShow(null);
                    toast.success(t("textAdded"));
                  })
                }
              />
            ) : (
              <>
                <div
                  className="vw-stage"
                  onPointerDown={(e) => {
                    if (e.pointerType !== "mouse" && !zoom.zoomed)
                      swipe.current = { x: e.clientX, y: e.clientY };
                  }}
                  onPointerUp={(e) => {
                    const start = swipe.current;
                    swipe.current = null;
                    if (!start) return;
                    const dx = e.clientX - start.x;
                    if (
                      Math.abs(dx) > 50 &&
                      Math.abs(dx) > Math.abs(e.clientY - start.y)
                    )
                      go(dx < 0 ? 1 : -1);
                  }}
                >
                  <button
                    type="button"
                    className="vw-nav"
                    aria-label={t("previous")}
                    disabled={pictures.length < 2}
                    onClick={() => go(-1)}
                  >
                    <ChevronLeft aria-hidden />
                  </button>
                  <div
                    className="vw-img"
                    ref={zoom.stageRef}
                    {...zoom.panProps}
                  >
                    {error ? (
                      <div className="vw-fail">
                        <CircleAlert aria-hidden />
                        {t("loadFailed")}
                        <button type="button" onClick={retry}>
                          {t("retry")}
                        </button>
                      </div>
                    ) : blobUrl ? (
                      <img
                        key={picture.id}
                        src={blobUrl}
                        alt={picture.originalFilename}
                        {...zoom.imgProps}
                      />
                    ) : (
                      <div className="vw-wait" />
                    )}
                  </div>
                  <button
                    type="button"
                    className="vw-nav"
                    aria-label={t("next")}
                    disabled={pictures.length < 2}
                    onClick={() => go(1)}
                  >
                    <ChevronRight aria-hidden />
                  </button>
                </div>
                {tags ? (
                  <ul className="vw-tags" aria-label={t("detectedTags")}>
                    {tags.labels.map((label) => {
                      const word = label.text ?? label.en;
                      return (
                        <li key={label.en}>
                          <Link
                            href={`/notes?q=${encodeURIComponent(word)}`}
                            title={t("searchFor", { word })}
                            onClick={() => onShow(null)}
                          >
                            {word}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="vw-hint">
                    <span className="dk">{t("hintDesktop")}</span>
                    <span className="ph">{t("hintTouch")}</span>
                  </div>
                )}
              </>
            )}
          </DialogPrimitive.Content>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
