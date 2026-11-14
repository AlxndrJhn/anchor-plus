"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type CropArea, WHOLE_PICTURE } from "../../picture-edits";

/** Adds, edits or removes the caption under a picture in the text. */
export function CaptionDialog({
  open,
  caption,
  onClose,
  onSave,
}: {
  open: boolean;
  caption: string;
  onClose: () => void;
  /** Undefined removes it. */
  onSave: (caption: string | undefined) => void;
}) {
  const t = useTranslations("editorMedia.inlineImage");
  const tc = useTranslations("common");
  const [text, setText] = React.useState(caption);
  React.useEffect(() => {
    if (open) setText(caption);
  }, [open, caption]);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(text.trim() || undefined);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {caption ? t("editCaption") : t("addCaption")}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Field label={t("caption")}>
              <Input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            {caption && (
              <Button
                type="button"
                variant="quiet"
                className="mr-auto"
                onClick={() => onSave(undefined)}
              >
                {tc("remove")}
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit">{tc("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Corner = "nw" | "ne" | "sw" | "se";

/** The smallest part a crop can keep, as a share of each side. */
const MIN_SHARE = 0.05;
/** How far an arrow key moves a corner. */
const KEY_STEP = 0.01;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/** Moves one corner, keeping the area at least MIN_SHARE on each side. */
export function moveCorner(
  area: CropArea,
  corner: Corner,
  x: number,
  y: number,
): CropArea {
  const next = { ...area };
  if (corner === "nw" || corner === "sw")
    next.left = clamp(x, 0, area.right - MIN_SHARE);
  else next.right = clamp(x, area.left + MIN_SHARE, 1);
  if (corner === "nw" || corner === "ne")
    next.top = clamp(y, 0, area.bottom - MIN_SHARE);
  else next.bottom = clamp(y, area.top + MIN_SHARE, 1);
  return next;
}

/** Moves the whole area by a share of the picture, inside it. */
export function moveArea(area: CropArea, dx: number, dy: number): CropArea {
  const x = clamp(dx, -area.left, 1 - area.right);
  const y = clamp(dy, -area.top, 1 - area.bottom);
  return {
    left: area.left + x,
    right: area.right + x,
    top: area.top + y,
    bottom: area.bottom + y,
  };
}

const CORNERS: { corner: Corner; cursor: string }[] = [
  { corner: "nw", cursor: "nwse-resize" },
  { corner: "ne", cursor: "nesw-resize" },
  { corner: "sw", cursor: "nesw-resize" },
  { corner: "se", cursor: "nwse-resize" },
];

/**
 * Chooses the part of a picture to keep: drag its corners or the frame
 * itself, or use the arrow keys on a corner.
 */
export function CropDialog({
  picture,
  initial = WHOLE_PICTURE,
  title,
  canKeepWhole = false,
  onClose,
  onCrop,
}: {
  picture: Blob | null;
  /** The part kept so far. */
  initial?: CropArea;
  title?: string;
  /** Whether keeping all of it is a change, e.g. undoing a crop. */
  canKeepWhole?: boolean;
  onClose: () => void;
  onCrop: (area: CropArea) => void;
}) {
  const t = useTranslations("editorMedia.inlineImage");
  const tc = useTranslations("common");
  const [area, setArea] = React.useState<CropArea>(WHOLE_PICTURE);
  const [url, setUrl] = React.useState<string | null>(null);
  const frame = React.useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: starts over for each picture only
  React.useEffect(() => {
    if (!picture) return;
    setArea(initial);
    const next = URL.createObjectURL(picture);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [picture]);

  /** Follows the pointer from a press, as a share of the picture. */
  const drag = (
    e: React.PointerEvent,
    update: (x: number, y: number, start: CropArea) => CropArea,
  ) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Not a pointer the browser knows, e.g. one the demos send.
    }
    const start = area;
    const move = (event: PointerEvent) =>
      setArea(
        update(
          (event.clientX - box.left) / box.width,
          (event.clientY - box.top) / box.height,
          start,
        ),
      );
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const isWhole =
    area.left === 0 && area.top === 0 && area.right === 1 && area.bottom === 1;

  return (
    <Dialog open={!!picture} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title ?? t("cropTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="justify-items-center">
          {url && (
            <div
              ref={frame}
              className="relative max-w-full touch-none select-none"
            >
              <img
                src={url}
                alt={t("beingCropped")}
                draggable={false}
                className="block max-h-[60vh] max-w-full rounded-md"
              />
              <div
                className="absolute cursor-move shadow-[0_0_0_9999px_rgb(0_0_0/.5)] outline-2 outline-white outline-offset-0"
                style={{
                  left: `${area.left * 100}%`,
                  top: `${area.top * 100}%`,
                  width: `${(area.right - area.left) * 100}%`,
                  height: `${(area.bottom - area.top) * 100}%`,
                }}
                onPointerDown={(e) => {
                  const box = frame.current?.getBoundingClientRect();
                  if (!box) return;
                  const fromX = (e.clientX - box.left) / box.width;
                  const fromY = (e.clientY - box.top) / box.height;
                  drag(e, (x, y, start) =>
                    moveArea(start, x - fromX, y - fromY),
                  );
                }}
              >
                {CORNERS.map(({ corner, cursor }) => (
                  <button
                    key={corner}
                    type="button"
                    aria-label={t(`corner.${corner}`)}
                    className="absolute size-5 rounded-full border-2 border-white bg-accent-strong shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    style={{
                      cursor,
                      left: corner.endsWith("w") ? -10 : undefined,
                      right: corner.endsWith("e") ? -10 : undefined,
                      top: corner.startsWith("n") ? -10 : undefined,
                      bottom: corner.startsWith("s") ? -10 : undefined,
                    }}
                    onPointerDown={(e) =>
                      drag(e, (x, y, start) => moveCorner(start, corner, x, y))
                    }
                    onKeyDown={(e) => {
                      const dx =
                        e.key === "ArrowLeft"
                          ? -KEY_STEP
                          : e.key === "ArrowRight"
                            ? KEY_STEP
                            : 0;
                      const dy =
                        e.key === "ArrowUp"
                          ? -KEY_STEP
                          : e.key === "ArrowDown"
                            ? KEY_STEP
                            : 0;
                      if (!dx && !dy) return;
                      e.preventDefault();
                      const x = corner.endsWith("w") ? area.left : area.right;
                      const y = corner.startsWith("n") ? area.top : area.bottom;
                      setArea(moveCorner(area, corner, x + dx, y + dy));
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="quiet"
            className="mr-auto"
            disabled={isWhole}
            onClick={() => setArea(WHOLE_PICTURE)}
          >
            {t("reset")}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            disabled={isWhole && !canKeepWhole}
            onClick={() => onCrop(area)}
          >
            {t("crop")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
