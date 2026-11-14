"use client";

import {
  Captions,
  Crop,
  Expand,
  FlipHorizontal2,
  FlipVertical2,
  ImageUp,
  Maximize2,
  PencilLine,
  Trash2,
} from "lucide-react";
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
import { isStorageFull, toastStorageFull } from "@/lib/api/upload";
import {
  encodeInlineImage,
  INLINE_IMAGE_EMBED,
  INLINE_IMAGE_MIN_WIDTH,
  type InlineImage,
  parseInlineImage,
  resizedWidth,
} from "../../inline-images";
import { editPicture, type PictureEdit } from "../../picture-edits";
import type { QuillDelta, QuillInstance } from "../../quill";
import { DrawingDialog } from "./drawing-dialog";
import { CaptionDialog, CropDialog } from "./inline-image-dialogs";

/** What the note gives the editor to keep pictures in its text. */
export interface InlinePictureHost {
  /** Uploads pictures to the note; their attachment ids, in order. */
  upload: (files: File[]) => Promise<string[]>;
  /** The picture's file. */
  load: (id: string) => Promise<Blob>;
  /** Deletes an attachment the text no longer shows. */
  remove: (id: string, done?: () => void) => void;
  /** Keeps it out of the strip while its deletion can be undone. */
  hold: (id: string, held: boolean) => void;
  /** Opens a picture in the viewer. */
  view: (id: string) => void;
}

export interface InlineImageToolsHandle {
  /** Chooses pictures to put in the text at the caret. */
  pick: () => void;
  /** Puts pasted pictures in the text at the caret. */
  insert: (files: File[]) => void;
  /** Opens a pad to draw a picture, put in the text at the caret. */
  draw: () => void;
}

type BlotLookup = {
  scroll: { find: (node: Node) => unknown };
  getIndex: (blot: unknown) => number;
};

const asDelta = (delta: Delta) => delta as unknown as QuillDelta;

function embedOf(op: { insert?: unknown }) {
  const insert = op.insert;
  if (!insert || typeof insert !== "object") return null;
  return parseInlineImage(
    (insert as Record<string, unknown>)[INLINE_IMAGE_EMBED],
  );
}

/** Where the text shows picture `id`, nearest to `near`; -1 if nowhere. */
export function findInlineImage(delta: QuillDelta, id: string, near = 0) {
  let index = 0;
  let found = -1;
  for (const op of delta.ops) {
    const length = typeof op.insert === "string" ? op.insert.length : 1;
    if (embedOf(op)?.id === id) {
      if (found < 0 || Math.abs(index - near) < Math.abs(found - near))
        found = index;
    }
    index += length;
  }
  return found;
}

function imageAt(quill: QuillInstance, index: number) {
  const [op] = quill.getContents(index, 1).ops;
  return op ? embedOf(op) : null;
}

function indexOfNode(quill: QuillInstance, node: Node) {
  const lookup = quill as unknown as BlotLookup;
  const blot = lookup.scroll.find(node);
  return blot ? lookup.getIndex(blot) : -1;
}

/** Puts `image` in place of the picture at `index`, as one undo step. */
function replaceAt(quill: QuillInstance, index: number, image: InlineImage) {
  quill.history.cutoff();
  quill.updateContents(
    asDelta(
      new Delta()
        .retain(index)
        .insert({ [INLINE_IMAGE_EMBED]: encodeInlineImage(image) })
        .delete(1),
    ),
    "user",
  );
  quill.history.cutoff();
}

/** Line formats to keep when a line is split, e.g. a list. */
const LINE_FORMATS = ["list", "header", "blockquote", "align", "indent"];

/**
 * Puts pictures on lines of their own at `at`, splitting the line there if
 * needed, as Android does; one undo step. The caret goes after them.
 */
export function insertPictures(
  quill: QuillInstance,
  at: number,
  ids: string[],
) {
  insertEmbedLines(
    quill,
    at,
    ids.map((id) => ({ [INLINE_IMAGE_EMBED]: encodeInlineImage({ id }) })),
  );
}

/** Puts embeds on lines of their own at `at`, as insertPictures does. */
export function insertEmbedLines(
  quill: QuillInstance,
  at: number,
  embeds: Record<string, string>[],
) {
  if (!embeds.length) return;
  const index = Math.max(0, Math.min(at, quill.getLength() - 1));
  const change = new Delta().retain(index);
  let length = 0;
  if (index > 0 && quill.getText(index - 1, 1) !== "\n") {
    const format = quill.getFormat(index, 0);
    const line = Object.fromEntries(
      LINE_FORMATS.filter((name) => format[name] !== undefined).map((name) => [
        name,
        format[name],
      ]),
    );
    change.insert("\n", line);
    length++;
  }
  for (const embed of embeds) {
    change.insert(embed).insert("\n");
    length += 2;
  }
  quill.history.cutoff();
  quill.updateContents(asDelta(change), "user");
  quill.history.cutoff();
  quill.setSelection(index + length, 0, "user");
}

interface Hovered {
  node: HTMLElement;
  /** The resize grip's place, inside the editor's box. */
  left: number;
  top: number;
}

interface Menu {
  node: HTMLElement;
  x: number;
  y: number;
  image: InlineImage;
}

/**
 * The tools for pictures in the text, as on Android: drag the corner that
 * shows on hover to resize one; right-click (or hold) for replace, crop,
 * mirror, caption and delete. Crops, mirrors and replacements are saved as
 * new attachments, since a stored file never changes.
 */
export const InlineImageTools = React.forwardRef<
  InlineImageToolsHandle,
  {
    getQuill: () => QuillInstance | null;
    container: HTMLElement | null;
    host: InlinePictureHost;
  }
>(({ getQuill, container, host }, ref) => {
  const [hovered, setHovered] = React.useState<Hovered | null>(null);
  const [menu, setMenu] = React.useState<Menu | null>(null);
  const [captioning, setCaptioning] = React.useState<Menu | null>(null);
  const [cropping, setCropping] = React.useState<{
    menu: Menu;
    picture: Blob;
  } | null>(null);
  /** A new drawing ("new"), or drawing on the menu's picture. */
  const [drawing, setDrawing] = React.useState<
    "new" | { menu: Menu; picture: Blob } | null
  >(null);
  const resizing = React.useRef(false);
  const insertInput = React.useRef<HTMLInputElement>(null);
  const replaceInput = React.useRef<HTMLInputElement>(null);
  const replacing = React.useRef<Menu | null>(null);
  const caretForInsert = React.useRef(0);

  const place = React.useCallback(
    (node: HTMLElement): Hovered | null => {
      const img = node.querySelector("img");
      if (!container || !img?.getAttribute("src")) return null;
      const box = img.getBoundingClientRect();
      const around = container.getBoundingClientRect();
      return {
        node,
        left: box.right - around.left - 9,
        top: box.bottom - around.top - 9,
      };
    },
    [container],
  );

  // The grip shows while the pointer is over a picture, or over the grip.
  React.useEffect(() => {
    if (!container) return;
    const over = (e: PointerEvent) => {
      if (resizing.current) return;
      const target = e.target as Element | null;
      if (target?.closest?.(".nit-grip")) return;
      const node = target?.closest?.<HTMLElement>(".ql-editor .note-image");
      setHovered(node ? place(node) : null);
    };
    const leave = () => {
      if (!resizing.current) setHovered(null);
    };
    container.addEventListener("pointerover", over);
    container.addEventListener("pointerleave", leave);
    return () => {
      container.removeEventListener("pointerover", over);
      container.removeEventListener("pointerleave", leave);
    };
  }, [container, place]);

  // Right-click, or a long press on a touch screen, opens the menu.
  React.useEffect(() => {
    if (!container) return;
    const open = (e: MouseEvent) => {
      const node = (e.target as Element | null)?.closest?.<HTMLElement>(
        ".ql-editor .note-image",
      );
      const quill = getQuill();
      if (!node || !quill) return;
      const index = indexOfNode(quill, node);
      const image = index < 0 ? null : imageAt(quill, index);
      if (!image) return;
      e.preventDefault();
      setHovered(null);
      setMenu({ node, x: e.clientX, y: e.clientY, image });
    };
    container.addEventListener("contextmenu", open);
    return () => container.removeEventListener("contextmenu", open);
  }, [container, getQuill]);

  /** Where the menu's picture is now; the text may have changed. */
  const locate = (from: Menu) => {
    const quill = getQuill();
    if (!quill) return null;
    const near = from.node.isConnected ? indexOfNode(quill, from.node) : 0;
    const index =
      near >= 0 && imageAt(quill, near)?.id === from.image.id
        ? near
        : findInlineImage(quill.getContents(), from.image.id, near);
    const image = index < 0 ? null : imageAt(quill, index);
    return image ? { quill, index, image } : null;
  };

  /** Deletes the old file once the text no longer shows it anywhere. */
  const dropIfUnused = (quill: QuillInstance, id: string) => {
    if (findInlineImage(quill.getContents(), id) < 0) host.remove(id);
  };

  /** Shows `file` in place of the menu's picture, keeping size and caption. */
  const swap = async (from: Menu, file: File) => {
    from.node.setAttribute("data-busy", "");
    try {
      const [id] = await host.upload([file]);
      const at = locate(from);
      if (!id || !at) return;
      replaceAt(at.quill, at.index, { ...at.image, id });
      dropIfUnused(at.quill, from.image.id);
    } catch (error) {
      if (isStorageFull(error)) toastStorageFull(error);
      else toast.error("Couldn’t change the picture");
    } finally {
      from.node.removeAttribute("data-busy");
    }
  };

  const edit = async (from: Menu, change: PictureEdit, picture?: Blob) => {
    from.node.setAttribute("data-busy", "");
    try {
      const file = await editPicture(
        picture ?? (await host.load(from.image.id)),
        change,
      );
      await swap(from, file);
    } catch {
      toast.error("Couldn’t change the picture");
      from.node.removeAttribute("data-busy");
    }
  };

  const remove = (from: Menu) => {
    const at = locate(from);
    if (!at) return;
    const { quill, index, image } = at;
    const length = quill.getText(index + 1, 1) === "\n" ? 2 : 1;
    const removed = quill.getContents(index, length);
    quill.history.cutoff();
    quill.deleteText(index, length, "user");
    quill.history.cutoff();
    quill.setSelection(index, 0, "silent");
    host.hold(image.id, true);
    toast.success("Picture deleted", {
      undo: () => {
        host.hold(image.id, false);
        quill.updateContents(
          asDelta(
            new Delta()
              .retain(index)
              .concat(
                new Delta(
                  removed.ops as ConstructorParameters<typeof Delta>[0],
                ),
              ),
          ),
          "user",
        );
      },
      onClose: () => {
        if (findInlineImage(quill.getContents(), image.id) < 0)
          host.remove(image.id, () => host.hold(image.id, false));
        else host.hold(image.id, false);
      },
    });
  };

  const setWidth = (from: Menu, width: number | undefined) => {
    const at = locate(from);
    if (at) replaceAt(at.quill, at.index, { ...at.image, width });
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
      const image = index < 0 ? null : imageAt(quill, index);
      if (event.type === "pointercancel" || !image) {
        node.style.setProperty("--note-image-width", before);
        setHovered(place(node));
        return;
      }
      const width = resizedWidth(share);
      if (width === image.width) {
        node.style.setProperty("--note-image-width", before);
        return;
      }
      replaceAt(quill, index, { ...image, width });
      setHovered(null);
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", finish);
    grip.addEventListener("pointercancel", finish);
  };

  const keepCaret = () => {
    const quill = getQuill();
    const caret = quill?.getSelection() ?? quill?.selection.savedRange;
    caretForInsert.current = caret
      ? caret.index + caret.length
      : (quill?.getLength() ?? 1) - 1;
  };

  React.useImperativeHandle(ref, () => ({
    pick: () => {
      keepCaret();
      insertInput.current?.click();
    },
    insert: (files) => {
      keepCaret();
      void insertChosen(files);
    },
    draw: () => {
      keepCaret();
      setDrawing("new");
    },
  }));

  const insertChosen = async (files: File[]) => {
    const pictures = files.filter((file) => file.type.startsWith("image/"));
    if (!pictures.length) return;
    try {
      const ids = await host.upload(pictures);
      const quill = getQuill();
      if (quill && ids.length)
        insertPictures(quill, caretForInsert.current, ids);
    } catch (error) {
      if (isStorageFull(error)) toastStorageFull(error);
      else toast.error("Couldn’t add the picture");
    }
  };

  const shown = menu;
  return (
    <>
      <input
        ref={insertInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          void insertChosen(files);
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const [file] = e.target.files ?? [];
          e.target.value = "";
          const from = replacing.current;
          replacing.current = null;
          if (file && from) void swap(from, file);
        }}
      />
      {hovered && (
        <button
          type="button"
          className="nit-grip"
          aria-label="Drag to resize the picture"
          title="Drag to resize"
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
            aria-label="Picture"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem onSelect={() => host.view(shown.image.id)}>
              <Expand />
              View full size
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                replacing.current = shown;
                replaceInput.current?.click();
              }}
            >
              <ImageUp />
              Replace…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void host.load(shown.image.id).then(
                  (picture) => setCropping({ menu: shown, picture }),
                  () => toast.error("Couldn’t open the picture"),
                );
              }}
            >
              <Crop />
              Crop…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void host.load(shown.image.id).then(
                  (picture) => setDrawing({ menu: shown, picture }),
                  () => toast.error("Couldn’t open the picture"),
                );
              }}
            >
              <PencilLine />
              Draw on it…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void edit(shown, { mirror: "horizontally" })}
            >
              <FlipHorizontal2 />
              Mirror horizontally
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void edit(shown, { mirror: "vertically" })}
            >
              <FlipVertical2 />
              Mirror vertically
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCaptioning(shown)}>
              <Captions />
              {shown.image.caption ? "Edit caption…" : "Add caption…"}
            </DropdownMenuItem>
            {shown.image.width !== undefined && (
              <DropdownMenuItem onSelect={() => setWidth(shown, undefined)}>
                <Maximize2 />
                Full width
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger" onSelect={() => remove(shown)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
      <CaptionDialog
        open={!!captioning}
        caption={captioning?.image.caption ?? ""}
        onClose={() => setCaptioning(null)}
        onSave={(caption) => {
          const from = captioning;
          setCaptioning(null);
          if (!from) return;
          const at = locate(from);
          if (at) replaceAt(at.quill, at.index, { ...at.image, caption });
        }}
      />
      <CropDialog
        picture={cropping?.picture ?? null}
        onClose={() => setCropping(null)}
        onCrop={(area) => {
          const from = cropping;
          setCropping(null);
          if (from) void edit(from.menu, { crop: area }, from.picture);
        }}
      />
      <DrawingDialog
        open={!!drawing}
        background={drawing && drawing !== "new" ? drawing.picture : null}
        onClose={() => setDrawing(null)}
        onSave={(file) => {
          const from = drawing;
          setDrawing(null);
          if (from === "new") void insertChosen([file]);
          else if (from) void swap(from.menu, file);
        }}
      />
    </>
  );
});

InlineImageTools.displayName = "InlineImageTools";
