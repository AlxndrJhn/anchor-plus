"use client";

import {
  Crop,
  Maximize2,
  Mic,
  MicOff,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Delta from "quill-delta";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { INLINE_IMAGE_MIN_WIDTH, resizedWidth } from "../../inline-images";
import {
  adoptSource,
  capturedIn,
  forgetSource,
  isOwnedHere,
  liveDeviceId,
  liveDeviceLabel,
  restartSource,
  setMicMuted,
  stopCapture,
  viewOf,
} from "../../live-hub";
import {
  encodeLiveImage,
  LIVE_IMAGE_EMBED,
  type LiveImage,
  parseLiveImage,
} from "../../live-images";
import type { QuillDelta, QuillInstance } from "../../quill";
import { CropDialog } from "./inline-image-dialogs";
import { insertEmbedLines } from "./inline-image-tools";
import { type ChosenSource, LiveImageDialog } from "./live-image-dialog";

export interface LiveImageToolsHandle {
  /** Chooses a camera or screen to put in the text at the caret. */
  add: () => void;
}

type BlotLookup = {
  scroll: { find: (node: Node) => unknown };
  getIndex: (blot: unknown) => number;
};

const asDelta = (delta: Delta) => delta as unknown as QuillDelta;

/** How long a live image may be gone from the text before its video stops. */
const FORGET_AFTER_MS = 10_000;

function liveOf(op: { insert?: unknown }) {
  const insert = op.insert;
  if (!insert || typeof insert !== "object") return null;
  return parseLiveImage((insert as Record<string, unknown>)[LIVE_IMAGE_EMBED]);
}

function findLive(delta: QuillDelta, id: string, near = 0) {
  let index = 0;
  let found = -1;
  for (const op of delta.ops) {
    if (liveOf(op)?.id === id) {
      if (found < 0 || Math.abs(index - near) < Math.abs(found - near))
        found = index;
    }
    index += typeof op.insert === "string" ? op.insert.length : 1;
  }
  return found;
}

function liveAt(quill: QuillInstance, index: number) {
  const [op] = quill.getContents(index, 1).ops;
  return op ? liveOf(op) : null;
}

function indexOfNode(quill: QuillInstance, node: Node) {
  const lookup = quill as unknown as BlotLookup;
  const blot = lookup.scroll.find(node);
  return blot ? lookup.getIndex(blot) : -1;
}

function replaceAt(quill: QuillInstance, index: number, image: LiveImage) {
  quill.history.cutoff();
  quill.updateContents(
    asDelta(
      new Delta()
        .retain(index)
        .insert({ [LIVE_IMAGE_EMBED]: encodeLiveImage(image) })
        .delete(1),
    ),
    "user",
  );
  quill.history.cutoff();
}

const randomId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** One still of the whole video, to choose a crop on. */
async function stillOf(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context || !canvas.width) throw new Error("No video yet");
  context.drawImage(video, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject()), "image/png"),
  );
}

interface Menu {
  node: HTMLElement;
  x: number;
  y: number;
  image: LiveImage;
}

/**
 * The tools for live images in the text: drag the corner that shows on
 * hover to resize one; right-click (or hold) to crop it, stop or restart
 * this device's video, or delete it. Size and crop are kept in the note, so
 * every device shows the same part.
 */
export const LiveImageTools = React.forwardRef<
  LiveImageToolsHandle,
  {
    getQuill: () => QuillInstance | null;
    container: HTMLElement | null;
    noteId: string;
  }
>(({ getQuill, container, noteId }, ref) => {
  const t = useTranslations("editorMedia.liveImage");
  const tc = useTranslations("common");
  const [hovered, setHovered] = React.useState<{
    node: HTMLElement;
    left: number;
    top: number;
  } | null>(null);
  const [menu, setMenu] = React.useState<Menu | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);
  const [cropping, setCropping] = React.useState<{
    menu: Menu;
    still: Blob;
  } | null>(null);
  const resizing = React.useRef(false);
  const caretForInsert = React.useRef(0);

  const place = React.useCallback(
    (node: HTMLElement) => {
      const frame = node.querySelector(".live-frame");
      if (!container || !frame) return null;
      const box = frame.getBoundingClientRect();
      const around = container.getBoundingClientRect();
      return {
        node,
        left: box.right - around.left - 9,
        top: box.bottom - around.top - 9,
      };
    },
    [container],
  );

  React.useEffect(() => {
    if (!container) return;
    const over = (e: PointerEvent) => {
      if (resizing.current) return;
      const target = e.target as Element | null;
      if (target?.closest?.(".nit-grip")) return;
      const node = target?.closest?.<HTMLElement>(".ql-editor .live-image");
      setHovered(node ? place(node) : null);
    };
    const leave = () => {
      if (!resizing.current) setHovered(null);
    };
    const open = (e: MouseEvent) => {
      const node = (e.target as Element | null)?.closest?.<HTMLElement>(
        ".ql-editor .live-image",
      );
      const quill = getQuill();
      if (!node || !quill) return;
      const index = indexOfNode(quill, node);
      const image = index < 0 ? null : liveAt(quill, index);
      if (!image) return;
      e.preventDefault();
      setHovered(null);
      setMenu({ node, x: e.clientX, y: e.clientY, image });
    };
    container.addEventListener("pointerover", over);
    container.addEventListener("pointerleave", leave);
    container.addEventListener("contextmenu", open);
    return () => {
      container.removeEventListener("pointerover", over);
      container.removeEventListener("pointerleave", leave);
      container.removeEventListener("contextmenu", open);
    };
  }, [container, getQuill, place]);

  // A live image deleted from the text stops this device's camera or screen
  // once it stays gone, so undoing a deletion keeps it going.
  React.useEffect(() => {
    let quill: QuillInstance | null = null;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const check = () => {
      if (!quill) return;
      const contents = quill.getContents();
      for (const id of capturedIn(noteId)) {
        if (findLive(contents, id) >= 0) {
          clearTimeout(timers.get(id));
          timers.delete(id);
        } else if (!timers.has(id))
          timers.set(
            id,
            setTimeout(() => {
              timers.delete(id);
              const now = getQuill();
              if (now && findLive(now.getContents(), id) < 0) forgetSource(id);
            }, FORGET_AFTER_MS),
          );
      }
    };
    const attach = () => {
      const next = getQuill();
      if (next === quill) return;
      quill?.off("text-change", check);
      quill = next;
      quill?.on("text-change", check);
    };
    attach();
    const observer = container ? new MutationObserver(attach) : null;
    if (container) observer?.observe(container, { childList: true });
    return () => {
      observer?.disconnect();
      quill?.off("text-change", check);
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, [container, getQuill, noteId]);

  const locate = (from: Menu) => {
    const quill = getQuill();
    if (!quill) return null;
    const near = from.node.isConnected ? indexOfNode(quill, from.node) : 0;
    const index =
      near >= 0 && liveAt(quill, near)?.id === from.image.id
        ? near
        : findLive(quill.getContents(), from.image.id, near);
    const image = index < 0 ? null : liveAt(quill, index);
    return image ? { quill, index, image } : null;
  };

  const change = (from: Menu, edit: Partial<LiveImage>) => {
    const at = locate(from);
    if (at) replaceAt(at.quill, at.index, { ...at.image, ...edit });
  };

  const remove = (from: Menu) => {
    const at = locate(from);
    if (!at) return;
    const { quill, index } = at;
    const length = quill.getText(index + 1, 1) === "\n" ? 2 : 1;
    quill.history.cutoff();
    quill.deleteText(index, length, "user");
    quill.history.cutoff();
    quill.setSelection(index, 0, "silent");
    toast.success(t("deleted"), {
      undo: () => quill.history.undo(),
    });
  };

  const startResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    const node = hovered?.node;
    const quill = getQuill();
    const editor = node?.closest<HTMLElement>(".ql-editor");
    if (!node || !quill || !editor || e.button !== 0) return;
    e.preventDefault();
    const grip = e.currentTarget;
    try {
      grip.setPointerCapture(e.pointerId);
    } catch {
      // Not a pointer the browser knows, e.g. one the demos send.
    }
    resizing.current = true;
    const style = getComputedStyle(editor);
    const full =
      editor.clientWidth -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight);
    const startX = e.clientX;
    const startWidth = node.getBoundingClientRect().width;
    const before = node.style.getPropertyValue("--note-image-width");
    let share = startWidth / full;
    const move = (event: PointerEvent) => {
      share = Math.min(
        1,
        Math.max(
          INLINE_IMAGE_MIN_WIDTH,
          (startWidth + event.clientX - startX) / full,
        ),
      );
      node.style.setProperty("--note-image-width", `${share * 100}%`);
      setHovered(place(node));
    };
    const finish = (event: PointerEvent) => {
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", finish);
      grip.removeEventListener("pointercancel", finish);
      resizing.current = false;
      const index = indexOfNode(quill, node);
      const image = index < 0 ? null : liveAt(quill, index);
      const width = resizedWidth(share);
      if (event.type === "pointercancel" || !image || width === image.width) {
        node.style.setProperty("--note-image-width", before);
        setHovered(place(node));
        return;
      }
      replaceAt(quill, index, { ...image, width });
      setHovered(null);
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", finish);
    grip.addEventListener("pointercancel", finish);
  };

  React.useImperativeHandle(ref, () => ({
    add: () => {
      const quill = getQuill();
      const caret = quill?.getSelection() ?? quill?.selection.savedRange;
      caretForInsert.current = caret
        ? caret.index + caret.length
        : (quill?.getLength() ?? 1) - 1;
      setIsAdding(true);
    },
  }));

  const insert = ({ source, stream, camera, mic }: ChosenSource) => {
    setIsAdding(false);
    const quill = getQuill();
    if (!quill) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    const image: LiveImage = {
      id: randomId(),
      source,
      device: liveDeviceId(),
      label: liveDeviceLabel(),
      camera,
    };
    adoptSource(image.id, noteId, source, stream, {
      camera,
      mic,
      isOnDemand: source === "camera",
    });
    insertEmbedLines(quill, caretForInsert.current, [
      { [LIVE_IMAGE_EMBED]: encodeLiveImage(image) },
    ]);
  };

  const crop = async (from: Menu) => {
    const video = from.node.querySelector("video");
    try {
      if (!video?.videoWidth) throw new Error("No video yet");
      setCropping({ menu: from, still: await stillOf(video) });
    } catch {
      toast.error(t("cropWhenVideo"));
    }
  };

  const shown = menu;
  const isMine = shown ? isOwnedHere(shown.image) : false;
  const shownView = shown ? viewOf(shown.image.id) : null;
  const isShowing = !!shownView?.isOwn;
  return (
    <>
      {hovered && (
        <button
          type="button"
          className="nit-grip"
          aria-label={t("resizeLabel")}
          title={t("resize")}
          tabIndex={-1}
          style={{ left: hovered.left, top: hovered.top }}
          onPointerDown={startResize}
        />
      )}
      <DropdownMenu
        open={!!shown}
        onOpenChange={(open) => {
          if (!open) setMenu(null);
        }}
      >
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden
            className="pointer-events-none fixed size-0"
            style={{ left: shown?.x ?? 0, top: shown?.y ?? 0 }}
          />
        </DropdownMenuTrigger>
        {shown && (
          <DropdownMenuContent
            aria-label={t("menu")}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem onSelect={() => void crop(shown)}>
              <Crop />
              {t("cropMenu")}
            </DropdownMenuItem>
            {shown.image.width !== undefined && (
              <DropdownMenuItem
                onSelect={() => change(shown, { width: undefined })}
              >
                <Maximize2 />
                {t("fullWidth")}
              </DropdownMenuItem>
            )}
            {isShowing && shownView?.mic && (
              <DropdownMenuItem
                onSelect={() =>
                  setMicMuted(shown.image.id, shownView.mic === "on")
                }
              >
                {shownView.mic === "on" ? <MicOff /> : <Mic />}
                {shownView.mic === "on" ? t("muteMic") : t("unmuteMic")}
              </DropdownMenuItem>
            )}
            {isMine &&
              (isShowing ? (
                <DropdownMenuItem
                  onSelect={() =>
                    stopCapture(shown.image.id, { isTurnedOff: true })
                  }
                >
                  <Square />
                  {shown.image.source === "screen"
                    ? t("stopScreen")
                    : t("turnCameraOff")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() =>
                    void restartSource(shown.image, noteId).catch(() =>
                      toast.error(t("startFailed")),
                    )
                  }
                >
                  <Play />
                  {shown.image.source === "screen"
                    ? t("shareAgain")
                    : t("turnCameraOn")}
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger" onSelect={() => remove(shown)}>
              <Trash2 />
              {tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
      <LiveImageDialog
        open={isAdding}
        onClose={() => setIsAdding(false)}
        onAdd={insert}
      />
      <CropDialog
        picture={cropping?.still ?? null}
        initial={cropping?.menu.image.crop}
        title={t("cropTitle")}
        canKeepWhole={!!cropping?.menu.image.crop}
        onClose={() => setCropping(null)}
        onCrop={(area) => {
          const from = cropping;
          setCropping(null);
          if (from) change(from.menu, { crop: area });
        }}
      />
    </>
  );
});

LiveImageTools.displayName = "LiveImageTools";
