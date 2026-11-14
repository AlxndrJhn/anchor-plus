"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
} from "lucide-react";
import * as React from "react";
import { menuSurface } from "@/components/ui/dropdown-menu";
import { Tip } from "@/components/ui/tooltip";
import { isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { type QuillInstance, setLineAlign } from "../../quill";
import { ALIGNMENTS, type Alignment } from "../../quill-lines";

const ALIGN_TOOLS: Record<
  Alignment,
  { label: string; key: string; Icon: typeof TextAlignStart }
> = {
  left: { label: "Align left", key: "L", Icon: TextAlignStart },
  center: { label: "Align center", key: "E", Icon: TextAlignCenter },
  right: { label: "Align right", key: "R", Icon: TextAlignEnd },
  justify: { label: "Justify", key: "J", Icon: TextAlignJustify },
};

const keepSelection = (e: React.MouseEvent) => e.preventDefault();

/** The shortcut for [align], as the toolbar's tooltips write them. */
export function alignShortcut(align: Alignment) {
  const key = ALIGN_TOOLS[align].key;
  return isMac() ? `⇧⌘${key}` : `Ctrl+Shift+${key}`;
}

/**
 * The line's alignment: a button showing it, which opens the four. They
 * apply to every selected line, or the caret's.
 */
export function AlignButton({
  getQuill,
  current,
  disabled,
}: {
  getQuill: () => QuillInstance | null;
  current: Alignment;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [noteElement, setNoteElement] = React.useState<HTMLElement | null>(
    null,
  );
  const box = React.useRef<HTMLButtonElement>(null);
  React.useEffect(
    () => setNoteElement(box.current?.closest<HTMLElement>(".note") ?? null),
    [],
  );
  const { Icon } = ALIGN_TOOLS[current];

  const pick = (align: Alignment) => {
    const quill = getQuill();
    if (quill) setLineAlign(quill, align);
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Tip label="Align">
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={box}
            type="button"
            className="b"
            aria-label="Align"
            aria-disabled={disabled || undefined}
            onMouseDown={keepSelection}
            onClick={(e) => {
              e.preventDefault();
              if (!disabled) setOpen(!open);
            }}
          >
            <Icon aria-hidden />
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
            "al-pop rounded-menu animate-pop-in data-[side=top]:animate-pop-up data-[state=closed]:animate-pop-out",
          )}
        >
          <fieldset className="al-row" aria-label="Alignment">
            {ALIGNMENTS.map((align) => {
              const { label, Icon: AlignIcon } = ALIGN_TOOLS[align];
              const name = `${label} (${alignShortcut(align)})`;
              return (
                <Tip key={align} label={name}>
                  <button
                    type="button"
                    className="al-b"
                    aria-label={name}
                    aria-pressed={current === align}
                    onMouseDown={keepSelection}
                    onClick={() => pick(align)}
                  >
                    <AlignIcon aria-hidden />
                  </button>
                </Tip>
              );
            })}
          </fieldset>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
