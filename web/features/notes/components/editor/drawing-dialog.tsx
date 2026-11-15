"use client";

import {
  Eraser,
  Highlighter,
  Pen,
  Redo2,
  Smile,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button, IconButton } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { Tip } from "@/components/ui/tooltip";
import { isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";
import {
  addPoint,
  DEFAULT_EMOJI,
  DRAW_ASPECT,
  DRAW_COLORS,
  DRAW_SIZES,
  type DrawPoint,
  type DrawTool,
  drawFont,
  drawStroke,
  drawStrokes,
  fontSize,
  hasInk,
  type Mark,
  renderDrawing,
  type Stroke,
  type TextMark,
} from "../../drawing";
import {
  addRecent,
  loadRecentEmojis,
  saveRecentEmojis,
} from "../../emoji-data";
import { EmojiPicker } from "./emoji-picker";

const TOOLS: { tool: DrawTool; icon: React.ReactNode }[] = [
  { tool: "pen", icon: <Pen /> },
  { tool: "marker", icon: <Highlighter /> },
  { tool: "eraser", icon: <Eraser /> },
  { tool: "text", icon: <Type /> },
  { tool: "emoji", icon: <Smile /> },
];

/**
 * A pad to draw on with a mouse, finger or stylus (its pressure changes the
 * pen's width), and to put words or emojis on: click where they go. With
 * `background`, draws on that picture; the eraser only takes away ink.
 * Saving makes a PNG.
 */
export function DrawingDialog({
  open,
  background = null,
  onClose,
  onSave,
}: {
  open: boolean;
  /** A picture to draw on; blank paper without one. */
  background?: Blob | null;
  onClose: () => void;
  onSave: (file: File) => void;
}) {
  const t = useTranslations("editorMedia.drawing");
  const tc = useTranslations("common");
  const [strokes, setStrokes] = React.useState<Mark[]>([]);
  const [undone, setUndone] = React.useState<Mark[]>([]);
  const [tool, setTool] = React.useState<DrawTool>("pen");
  const [color, setColor] = React.useState<string>(DRAW_COLORS[0].value);
  const [size, setSize] = React.useState<number>(DRAW_SIZES[1].value);
  const [saving, setSaving] = React.useState(false);
  const [backgroundUrl, setBackgroundUrl] = React.useState<string | null>(null);
  const [aspect, setAspect] = React.useState(DRAW_ASPECT);
  const [pad, setPad] = React.useState<HTMLDivElement | null>(null);
  const [padWidth, setPadWidth] = React.useState(0);
  const [emoji, setEmoji] = React.useState<string>(DEFAULT_EMOJI);
  const [recentEmojis, setRecentEmojis] = React.useState<string[]>([]);
  /** Words being typed where the pad was clicked, not yet on it. */
  const [typing, setTyping] = React.useState<TextMark | null>(null);
  const typingRef = React.useRef(typing);
  typingRef.current = typing;
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const live = React.useRef<Stroke | null>(null);
  const strokesRef = React.useRef(strokes);
  strokesRef.current = strokes;

  // Starts over each time it opens.
  React.useEffect(() => {
    if (!open) return;
    setStrokes([]);
    setUndone([]);
    setTool("pen");
    setTyping(null);
    setSaving(false);
    const recent = loadRecentEmojis();
    setRecentEmojis(recent);
    if (recent[0]) setEmoji(recent[0]);
    live.current = null;
  }, [open]);

  React.useEffect(() => {
    if (!open || !background) {
      setBackgroundUrl(null);
      setAspect(DRAW_ASPECT);
      return;
    }
    const url = URL.createObjectURL(background);
    setBackgroundUrl(url);
    let cancelled = false;
    void createImageBitmap(background).then(
      (bitmap) => {
        if (!cancelled && bitmap.width) setAspect(bitmap.height / bitmap.width);
        bitmap.close();
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [open, background]);

  /** Draws every stroke again, at the canvas's size. */
  const redraw = React.useCallback(() => {
    const el = canvas.current;
    const context = el?.getContext("2d");
    if (!el || !context) return;
    context.clearRect(0, 0, el.width, el.height);
    drawStrokes(context, strokesRef.current, el.width);
    if (live.current) drawStroke(context, live.current, el.width);
  }, []);

  // The canvas has as many pixels as the screen shows, at any size.
  React.useEffect(() => {
    const el = canvas.current;
    if (!pad || !el) return;
    const fitToPad = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(pad.clientWidth * ratio);
      const height = Math.round(pad.clientHeight * ratio);
      setPadWidth(pad.clientWidth);
      if (el.width === width && el.height === height) return;
      el.width = width;
      el.height = height;
      redraw();
    };
    fitToPad();
    const observer = new ResizeObserver(fitToPad);
    observer.observe(pad);
    return () => observer.disconnect();
  }, [pad, redraw]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: strokes change what is drawn
  React.useEffect(redraw, [strokes, redraw]);

  const pointAt = (e: PointerEvent | React.PointerEvent): DrawPoint | null => {
    if (!pad) return null;
    const box = pad.getBoundingClientRect();
    if (!box.width) return null;
    return {
      x: (e.clientX - box.left) / box.width,
      y: (e.clientY - box.top) / box.width,
      pressure: e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const addMark = (mark: Mark) => {
    setStrokes((current) => [...current, mark]);
    setUndone([]);
  };

  /** Puts the typed words on the pad, if there are any. */
  const finishTyping = () => {
    const words = typingRef.current;
    typingRef.current = null;
    setTyping(null);
    if (words?.text.trim()) addMark({ ...words, text: words.text.trimEnd() });
  };

  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || live.current) return;
    if ((e.target as Element).closest("input")) return;
    const point = pointAt(e);
    if (!point) return;
    e.preventDefault();
    if (typingRef.current) {
      // A click away from the words finishes them.
      finishTyping();
      if (tool === "text") return;
    }
    if (tool === "text") {
      setTyping({
        tool: "text",
        text: "",
        color,
        size,
        x: point.x,
        y: point.y,
      });
      return;
    }
    if (tool === "emoji") {
      const recent = addRecent(recentEmojis, emoji);
      setRecentEmojis(recent);
      saveRecentEmojis(recent);
      addMark({
        tool: "emoji",
        text: emoji,
        color,
        size,
        x: point.x,
        y: point.y,
      });
      return;
    }
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Not a pointer the browser knows.
    }
    const pointerId = e.pointerId;
    const stroke: Stroke = { tool, color, size, points: [point] };
    live.current = stroke;
    redraw();
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      // Coalesced events keep fast lines smooth.
      const events = event.getCoalescedEvents?.() ?? [event];
      let changed = false;
      for (const each of events.length ? events : [event]) {
        const next = pointAt(each);
        if (next && addPoint(stroke.points, next)) changed = true;
      }
      if (changed) redraw();
    };
    const end = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      live.current = null;
      addMark(stroke);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const undo = () => {
    const last = strokes[strokes.length - 1];
    if (!last) return;
    setStrokes(strokes.slice(0, -1));
    setUndone([...undone, last]);
  };
  const redo = () => {
    const last = undone[undone.length - 1];
    if (!last) return;
    setUndone(undone.slice(0, -1));
    setStrokes([...strokes, last]);
  };
  const clear = () => {
    if (!strokes.length) return;
    // Clearing is one step back, so it can be undone too.
    setUndone([]);
    setStrokes([]);
    const cleared = strokes;
    toast.success(t("cleared"), {
      undo: () => setStrokes(cleared),
    });
  };

  const save = async () => {
    const words = typingRef.current;
    const marks =
      words?.text.trim() && !strokesRef.current.includes(words)
        ? [...strokesRef.current, words]
        : strokesRef.current;
    finishTyping();
    setSaving(true);
    try {
      onSave(await renderDrawing(marks, background));
    } catch {
      toast.error(t("saveFailed"));
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Typing has its own undo.
    if ((e.target as Element).closest("input")) return;
    const mod = isMac() ? e.metaKey : e.ctrlKey;
    if (!mod || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((key === "z" && e.shiftKey) || key === "y") {
      e.preventDefault();
      redo();
    }
  };

  const modKey = isMac() ? "⌘" : "Ctrl+";
  const canSave = hasInk(strokes) || !!typing?.text.trim();
  const showsColor = tool !== "eraser" && tool !== "emoji";
  // The emoji picker takes room above the pad, so the pad shrinks to fit.
  const padMaxHeight =
    tool === "emoji" ? "max(28vh, calc(60vh - 300px))" : "60vh";
  const typingPx = typing ? fontSize(typing) * padWidth : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        size="lg"
        onKeyDown={onKeyDown}
        // Escape while typing drops the words, not the drawing.
        onEscapeKeyDown={(e) => {
          if (!typingRef.current) return;
          e.preventDefault();
          typingRef.current = null;
          setTyping(null);
        }}
        // A stray click beside the pad mustn't throw the drawing away.
        onInteractOutside={(e) => {
          if (strokesRef.current.length || typingRef.current)
            e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {background ? t("titleOnPicture") : t("title")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-3">
          <div
            role="toolbar"
            aria-label={t("tools")}
            className="flex flex-wrap items-center gap-x-3 gap-y-2"
          >
            <div className="flex items-center gap-0.5">
              {TOOLS.map((each) => (
                <Tip key={each.tool} label={t(`tool.${each.tool}`)}>
                  <IconButton
                    size="sm"
                    label={t(`tool.${each.tool}`)}
                    aria-pressed={tool === each.tool}
                    onClick={() => {
                      finishTyping();
                      setTool(each.tool);
                    }}
                  >
                    {each.icon}
                  </IconButton>
                </Tip>
              ))}
            </div>
            <div
              className={cn(
                "flex items-center gap-1",
                !showsColor && "pointer-events-none opacity-35",
              )}
            >
              {DRAW_COLORS.map((each) => (
                <button
                  key={each.value}
                  type="button"
                  aria-pressed={color === each.value}
                  aria-label={each.name}
                  title={each.name}
                  tabIndex={showsColor ? undefined : -1}
                  onClick={() => setColor(each.value)}
                  className={cn(
                    "size-6 cursor-pointer rounded-full border-0 p-0 shadow-[inset_0_0_0_1px_rgb(0_0_0/.15)] transition-shadow",
                    color === each.value &&
                      "shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--foreground)]",
                  )}
                  style={{ backgroundColor: each.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              {DRAW_SIZES.map((each) => (
                <Tip key={each.name} label={each.name}>
                  <IconButton
                    size="sm"
                    label={each.name}
                    aria-pressed={size === each.value}
                    onClick={() => setSize(each.value)}
                  >
                    <span
                      aria-hidden
                      className="block rounded-full bg-current"
                      style={{
                        width: 4 + DRAW_SIZES.indexOf(each) * 4,
                        height: 4 + DRAW_SIZES.indexOf(each) * 4,
                      }}
                    />
                  </IconButton>
                </Tip>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-0.5">
              <Tip label={t("undoWithKey", { key: `${modKey}Z` })}>
                <IconButton
                  size="sm"
                  label={tc("undo")}
                  disabled={!strokes.length}
                  onClick={undo}
                >
                  <Undo2 />
                </IconButton>
              </Tip>
              <Tip
                label={t("redoWithKey", { key: isMac() ? "⇧⌘Z" : "Ctrl+Y" })}
              >
                <IconButton
                  size="sm"
                  label={tc("redo")}
                  disabled={!undone.length}
                  onClick={redo}
                >
                  <Redo2 />
                </IconButton>
              </Tip>
              <Tip label={t("clear")}>
                <IconButton
                  size="sm"
                  tone="danger"
                  label={t("clear")}
                  disabled={!strokes.length}
                  onClick={clear}
                >
                  <Trash2 />
                </IconButton>
              </Tip>
            </div>
          </div>
          {tool === "emoji" && (
            <EmojiPicker
              value={emoji}
              recent={recentEmojis}
              onPick={setEmoji}
            />
          )}
          <div
            ref={setPad}
            role="img"
            aria-label={
              tool === "text"
                ? t("padText")
                : tool === "emoji"
                  ? t("padEmoji")
                  : t("padDraw")
            }
            data-testid="drawing-pad"
            className={cn(
              "relative w-full touch-none select-none overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_rgb(0_0_0/.12)]",
              tool === "eraser"
                ? "cursor-cell"
                : tool === "text"
                  ? "cursor-text"
                  : tool === "emoji"
                    ? "cursor-copy"
                    : "cursor-crosshair",
            )}
            style={{
              aspectRatio: `1 / ${aspect}`,
              maxHeight: padMaxHeight,
              // Keeps the shape when the height is capped.
              maxWidth: `calc(${padMaxHeight} / ${aspect})`,
              marginInline: "auto",
            }}
            onPointerDown={start}
          >
            {backgroundUrl && (
              <img
                src={backgroundUrl}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 size-full"
              />
            )}
            <canvas
              ref={canvas}
              className="pointer-events-none absolute inset-0 size-full"
            />
            {typing && (
              <input
                autoFocus
                aria-label={t("textInput")}
                value={typing.text}
                size={Math.max(4, typing.text.length + 1)}
                onChange={(e) => setTyping({ ...typing, text: e.target.value })}
                onBlur={finishTyping}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    finishTyping();
                  } else if (e.key === "Escape") {
                    // Drops the words, not the drawing.
                    e.preventDefault();
                    e.stopPropagation();
                    typingRef.current = null;
                    setTyping(null);
                  }
                }}
                className="absolute m-0 max-w-full -translate-y-1/2 border-0 bg-transparent p-0 outline-1 outline-current outline-dashed outline-offset-2"
                style={{
                  left: typing.x * padWidth,
                  top: typing.y * padWidth,
                  font: drawFont(typingPx),
                  lineHeight: 1.2,
                  color: typing.color,
                }}
              />
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            busy={saving ? tc("saving") : undefined}
            onClick={() => void save()}
          >
            {background ? tc("save") : t("insert")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
