"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Baseline, Pipette } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { menuSurface } from "@/components/ui/dropdown-menu";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getTextFormat, isInCodeBlock, type QuillInstance } from "../../quill";
import { FONTS, TEXT_COLORS, toHexColor } from "../../text-style";
import { useColorsMenu } from "./colors-menu";

type Range = { index: number; length: number };

/** Sets a format on [range], or for what's typed next at a caret. */
function applyFormat(
  quill: QuillInstance,
  range: Range,
  name: "color" | "font" | "highlight",
  value: string | false,
) {
  if (isInCodeBlock(quill, range)) return;
  if (range.length)
    quill.formatText(range.index, range.length, name, value, "user");
  else {
    quill.setSelection(range.index, 0, "silent");
    quill.format(name, value, "user");
  }
}

const keepSelection = (e: React.MouseEvent) => e.preventDefault();

/**
 * Text colour, font, and a highlight in any colour, for the selection:
 * a button that opens them. The selection is kept from when it opened, so
 * the system colour picker can take focus.
 */
export function TextStyleButton({
  getQuill,
  disabled,
  className = "b",
  inBubble = false,
}: {
  getQuill: () => QuillInstance | null;
  disabled?: boolean;
  /** The toolbar's button class. */
  className?: string;
  /** In the selection bubble, which mustn't step aside for its own menu. */
  inBubble?: boolean;
}) {
  const t = useTranslations("editor.textStyle");
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<Range | null>(null);
  const [current, setCurrent] = React.useState<Record<string, unknown>>({});
  const [noteElement, setNoteElement] = React.useState<HTMLElement | null>(
    null,
  );
  const box = React.useRef<HTMLButtonElement>(null);
  React.useEffect(
    () => setNoteElement(box.current?.closest<HTMLElement>(".note") ?? null),
    [],
  );
  React.useEffect(() => {
    if (!open || inBubble) return;
    useColorsMenu.setState({ isOpen: true });
    return () => useColorsMenu.setState({ isOpen: false });
  }, [open, inBubble]);

  const openStyles = () => {
    const quill = getQuill();
    const selection = quill?.getSelection();
    if (!quill || !selection) return;
    setRange(selection);
    setCurrent(getTextFormat(quill, selection.index, selection.length));
    setOpen(true);
  };

  const apply = (
    name: "color" | "font" | "highlight",
    value: string | false,
    close = true,
  ) => {
    const quill = getQuill();
    if (!quill || !range) return;
    applyFormat(quill, range, name, value);
    setCurrent(getTextFormat(quill, range.index, range.length));
    if (close) {
      setOpen(false);
      quill.setSelection(range.index, range.length, "silent");
    }
  };

  const textColor = toHexColor(current.color);
  const highlight = current.highlight;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Tip label={t("button")}>
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={box}
            type="button"
            className={className}
            aria-label={t("button")}
            aria-disabled={disabled || undefined}
            onMouseDown={keepSelection}
            onClick={(e) => {
              e.preventDefault();
              if (disabled) return;
              if (open) setOpen(false);
              else openStyles();
            }}
          >
            <Baseline aria-hidden />
          </button>
        </PopoverPrimitive.Trigger>
      </Tip>
      {/* Inside the note, whose styles set the colors. */}
      <PopoverPrimitive.Portal container={noteElement}>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={cn(
            menuSurface,
            "ts-pop rounded-menu animate-pop-in data-[side=top]:animate-pop-up data-[state=closed]:animate-pop-out",
          )}
        >
          <div className="ts-head">{t("textColor")}</div>
          <fieldset className="ts-row" aria-label={t("textColor")}>
            <button
              type="button"
              className="ts-dot ts-none"
              aria-label={t("defaultColor")}
              aria-pressed={!textColor}
              onMouseDown={keepSelection}
              onClick={() => apply("color", false)}
            />
            {TEXT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                className="ts-dot"
                style={{ background: color.value }}
                aria-label={color.name}
                aria-pressed={textColor === color.value}
                onMouseDown={keepSelection}
                onClick={() => apply("color", color.value)}
              />
            ))}
            <ColorField
              label={t("pickTextColor")}
              value={textColor ?? "#000000"}
              onPick={(value) => apply("color", value, false)}
            />
          </fieldset>
          <div className="ts-head">{t("highlightAnyColor")}</div>
          <div className="ts-row">
            <ColorField
              label={t("pickHighlightColor")}
              value={
                typeof highlight === "string" && highlight.startsWith("#")
                  ? highlight
                  : "#feea74"
              }
              onPick={(value) => apply("highlight", value, false)}
              wide
            />
          </div>
          <div className="ts-head">{t("font")}</div>
          <fieldset className="ts-row" aria-label={t("font")}>
            {[{ name: t("defaultFont"), value: "" }, ...FONTS].map((font) => (
              <button
                key={font.name}
                type="button"
                className="ts-font"
                style={{ fontFamily: font.value || undefined }}
                aria-pressed={(current.font ?? "") === font.value}
                onMouseDown={keepSelection}
                onClick={() => apply("font", font.value || false)}
              >
                {font.name}
              </button>
            ))}
          </fieldset>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * The system colour picker, behind a swatch-sized button. Applies once a
 * colour is chosen, not on every step of dragging through the picker.
 */
function ColorField({
  label,
  value,
  onPick,
  wide = false,
}: {
  label: string;
  value: string;
  onPick: (value: string) => void;
  wide?: boolean;
}) {
  const t = useTranslations("editor.textStyle");
  return (
    <label className={cn("ts-dot ts-pick", wide && "ts-wide")} title={label}>
      <Pipette aria-hidden />
      {wide && <span>{t("pickColor")}</span>}
      <input
        ref={(input) => {
          if (!input) return;
          const onChange = () => {
            const hex = toHexColor(input.value);
            if (hex) onPick(hex);
          };
          input.addEventListener("change", onChange);
          return () => input.removeEventListener("change", onChange);
        }}
        type="color"
        aria-label={label}
        defaultValue={value}
      />
    </label>
  );
}
