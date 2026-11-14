"use client";

import { ClipboardCopy, TextCursorInput, TextSelect } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "@/components/ui/toast";
import {
  type ImageBox,
  type ImageText,
  imageWordAt,
  imageWordsIn,
  joinImageWords,
} from "@/lib/image-text";

/** How long a finger holds still before a drag selects text. */
const HOLD_MS = 400;
/** How far a finger may move and still count as holding still. */
const STILL_PX = 10;

interface Press {
  pointerId: number;
  x: number;
  y: number;
  touch: boolean;
  /**
   * What a drag does: from a word it selects the words in between; from
   * beside the text it draws a box. Unset, the press may yet be a tap.
   */
  mode?: { range: number } | { boxFrom: { x: number; y: number } };
  moved: boolean;
  timer?: number;
}

/**
 * A picture with the text found in it marked, to pick some of it, as the
 * text actions on Windows do: drag from a word to select the words in
 * between, drag from beside the text to box words in (hold first on a touch
 * screen), click one, or select all; then copy it or put it in the note.
 */
export function ImageTextView({
  src,
  alt,
  text,
  onInsert,
}: {
  src: string;
  alt: string;
  text: ImageText;
  /** Puts the chosen text in the note; absent when it can't be edited. */
  onInsert?: (text: string) => void;
}) {
  const t = useTranslations("noteEditor.attachments.imageText");
  const tc = useTranslations("common");
  const { words } = text;
  // The selected words, by index.
  const [selection, setSelectionState] = React.useState<ReadonlySet<number>>(
    () => new Set(),
  );
  // The box being drawn, in the picture's pixels.
  const [box, setBox] = React.useState<ImageBox | null>(null);
  // Said in the status line: a toast would cover these buttons.
  const [copied, setCopied] = React.useState(false);
  // Boxed in, words can come from anywhere on the picture: their text keeps
  // no blank lines between paragraphs.
  const [boxed, setBoxed] = React.useState(false);
  // A new selection hasn't been copied.
  const setSelection = (indices: Iterable<number>, fromBox = false) => {
    setCopied(false);
    setSelectionState(new Set(indices));
    setBoxed(fromBox);
  };
  const picture = React.useRef<HTMLDivElement>(null);
  const root = React.useRef<HTMLDivElement>(null);
  const press = React.useRef<Press | null>(null);
  const copiedTimer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => root.current?.focus(), []);
  React.useEffect(
    () => () => {
      window.clearTimeout(press.current?.timer);
      window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  const chosen = selection.size;
  const chosenText = () =>
    joinImageWords(
      [...selection].sort((a, b) => a - b).map((i) => words[i]),
      { paragraphs: !boxed },
    );

  /** A pointer's place in the picture's pixels, and a finger's width. */
  const toImage = (clientX: number, clientY: number) => {
    const shown = picture.current?.getBoundingClientRect();
    if (!shown?.width) return null;
    const scale = text.width / shown.width;
    return {
      x: (clientX - shown.left) * scale,
      y: (clientY - shown.top) * scale,
      slop: 12 * scale,
    };
  };

  /** The word under a pointer, with a finger's width of slack. */
  const wordAt = (clientX: number, clientY: number) => {
    const at = toImage(clientX, clientY);
    return at && imageWordAt(words, at.x, at.y, at.slop);
  };

  const range = (from: number, to: number) =>
    Array.from(
      { length: Math.abs(to - from) + 1 },
      (_, i) => Math.min(from, to) + i,
    );

  /** The drag starts: from a word, or a box from beside the text. */
  const startDrag = (clientX: number, clientY: number) => {
    const p = press.current;
    const at = toImage(clientX, clientY);
    if (!p || !at) return;
    const word = imageWordAt(words, at.x, at.y, at.slop);
    if (word !== null) {
      p.mode = { range: word };
      setSelection([word]);
    } else {
      p.mode = { boxFrom: { x: at.x, y: at.y } };
      setBox({ left: at.x, top: at.y, right: at.x, bottom: at.y });
      setSelection([]);
    }
  };

  const endDrag = () => {
    window.clearTimeout(press.current?.timer);
    press.current = null;
    setBox(null);
  };

  const selectAll = () => setSelection(words.keys());

  const copy = async () => {
    if (chosen <= 0) return;
    try {
      await navigator.clipboard.writeText(chosenText());
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Ctrl+A and Ctrl+C anywhere in the view act on its text
    <div
      ref={root}
      className="itv"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        const key = e.key.toLowerCase();
        if (key === "a") {
          e.preventDefault();
          selectAll();
        } else if (key === "c" && chosen > 0) {
          e.preventDefault();
          void copy();
        }
      }}
    >
      <div className="itv-stage">
        <div
          ref={picture}
          className="itv-pic"
          style={
            {
              "--w": text.width,
              "--h": text.height,
            } as React.CSSProperties
          }
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            const touch = e.pointerType !== "mouse";
            const { clientX, clientY } = e;
            const p: Press = {
              pointerId: e.pointerId,
              x: clientX,
              y: clientY,
              touch,
              moved: false,
            };
            press.current = p;
            // A mouse selects as it drags; a finger holds first.
            if (!touch) startDrag(clientX, clientY);
            else
              p.timer = window.setTimeout(() => {
                startDrag(clientX, clientY);
                navigator.vibrate?.(10);
              }, HOLD_MS);
          }}
          onPointerMove={(e) => {
            const p = press.current;
            if (p?.pointerId !== e.pointerId) return;
            if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > STILL_PX) {
              p.moved = true;
              if (!p.mode) window.clearTimeout(p.timer);
            }
            const mode = p.mode;
            if (!mode) return;
            if ("range" in mode) {
              const at = wordAt(e.clientX, e.clientY);
              if (at !== null) setSelection(range(mode.range, at));
              return;
            }
            const at = toImage(e.clientX, e.clientY);
            if (!at) return;
            const drawn = {
              left: Math.min(mode.boxFrom.x, at.x),
              top: Math.min(mode.boxFrom.y, at.y),
              right: Math.max(mode.boxFrom.x, at.x),
              bottom: Math.max(mode.boxFrom.y, at.y),
            };
            setBox(drawn);
            setSelection(imageWordsIn(words, drawn), true);
          }}
          onPointerUp={(e) => {
            const p = press.current;
            if (p?.pointerId !== e.pointerId) return;
            endDrag();
            // A drag keeps what it selected, and a swipe selects nothing.
            // Otherwise it was a click or tap: on a word, that word; beside
            // the text, none.
            if (p.moved || (p.mode && "range" in p.mode)) return;
            const at = wordAt(e.clientX, e.clientY);
            setSelection(at === null ? [] : [at]);
          }}
          onPointerCancel={endDrag}
        >
          <img src={src} alt={alt} draggable={false} />
          {words.map((word, i) => (
            <span
              key={i}
              aria-hidden
              className="itv-w"
              data-on={selection.has(i) ? "" : undefined}
              style={{
                left: `${(word.left / text.width) * 100}%`,
                top: `${(word.top / text.height) * 100}%`,
                width: `${((word.right - word.left) / text.width) * 100}%`,
                height: `${((word.bottom - word.top) / text.height) * 100}%`,
              }}
            />
          ))}
          {box && (
            <span
              aria-hidden
              className="itv-box"
              style={{
                left: `${(box.left / text.width) * 100}%`,
                top: `${(box.top / text.height) * 100}%`,
                width: `${((box.right - box.left) / text.width) * 100}%`,
                height: `${((box.bottom - box.top) / text.height) * 100}%`,
              }}
            />
          )}
        </div>
        {/* Over the picture, so its fading doesn't move the picture. */}
        <div
          className="itv-hint"
          aria-hidden={chosen > 0 || !!box}
          data-hidden={chosen > 0 || box ? "" : undefined}
        >
          <span className="dk">{t("hintDesktop")}</span>
          <span className="ph">{t("hintTouch")}</span>
        </div>
      </div>
      <div className="itv-bar">
        <div className="itv-status" aria-live="polite">
          {copied
            ? tc("copied")
            : chosen > 0
              ? t("selected", { count: chosen })
              : t("nothingSelected")}
        </div>
        <div className="itv-actions">
          <button
            type="button"
            onClick={selectAll}
            disabled={chosen === words.length}
          >
            <TextSelect aria-hidden />
            {t("selectAll")}
          </button>
          <button type="button" onClick={copy} disabled={chosen <= 0}>
            <ClipboardCopy aria-hidden />
            {tc("copy")}
          </button>
          {onInsert && (
            <button
              type="button"
              className="itv-insert"
              onClick={() => onInsert(chosenText())}
              disabled={chosen <= 0}
            >
              <TextCursorInput aria-hidden />
              {t("insert")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
