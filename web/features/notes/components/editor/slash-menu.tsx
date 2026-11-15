"use client";

import {
  CalendarDays,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Mic,
  PencilLine,
  Quote,
  Radio,
  ScanLine,
  Type,
  Workflow,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { menuItem, menuSurface } from "@/components/ui/dropdown-menu";
import { ShortcutHints } from "@/components/ui/shortcut-hints";
import { usePreferencesStore } from "@/features/preferences";
import { isPhoneWidth } from "@/lib/hooks/use-is-phone";
import { cn } from "@/lib/utils";
import { formatDate } from "../../date-stamp";
import { lineFormatChange, type QuillInstance } from "../../quill";
import { findSlashItems } from "../../slash-search";

type Kind =
  | "checklist"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullets"
  | "numbers"
  | "quote"
  | "code"
  | "text"
  | "link"
  | "date"
  | "attachment"
  | "record"
  | "draw"
  | "live"
  | "flowchart"
  | "scan";

/** The commands; their names and search words are in the messages. */
const ITEMS: {
  kind: Kind;
  icon: React.ReactNode;
  isPopular?: boolean;
  format?: Record<string, unknown>;
}[] = [
  {
    kind: "checklist",
    icon: <ListChecks />,
    isPopular: true,
    format: { list: "unchecked" },
  },
  {
    kind: "heading1",
    icon: <Heading1 />,
    isPopular: true,
    format: { header: 1 },
  },
  {
    kind: "heading2",
    icon: <Heading2 />,
    format: { header: 2 },
  },
  {
    kind: "heading3",
    icon: <Heading3 />,
    format: { header: 3 },
  },
  {
    kind: "bullets",
    icon: <List />,
    isPopular: true,
    format: { list: "bullet" },
  },
  {
    kind: "numbers",
    icon: <ListOrdered />,
    isPopular: true,
    format: { list: "ordered" },
  },
  {
    kind: "quote",
    icon: <Quote />,
    isPopular: true,
    format: { blockquote: true },
  },
  {
    kind: "code",
    icon: <Code />,
    format: { "code-block": "plain" },
  },
  {
    kind: "text",
    icon: <Type />,
    format: {},
  },
  { kind: "link", icon: <Link /> },
  {
    kind: "date",
    icon: <CalendarDays />,
  },
  {
    kind: "attachment",
    icon: <ImagePlus />,
    isPopular: true,
  },
  {
    kind: "record",
    icon: <Mic />,
  },
  {
    kind: "draw",
    icon: <PencilLine />,
  },
  {
    kind: "live",
    icon: <Radio />,
  },
  {
    kind: "flowchart",
    icon: <Workflow />,
  },
  {
    kind: "scan",
    icon: <ScanLine />,
  },
];

interface Slash {
  index: number;
  query: string;
}

interface Place {
  top: number;
  left: number;
  height: number;
}

interface SlashMenuProps {
  getQuill: () => QuillInstance | null;
  container: HTMLDivElement | null;
  onAddAttachment?: () => void;
  onRecordAudio?: () => void;
  onAddLink: () => void;
  onDraw?: () => void;
  onAddLiveImage?: () => void;
  onAddFlowchart?: () => void;
  onAddScan?: () => void;
}

export const isSlashMenuOpen = (root: HTMLElement) =>
  root.hasAttribute("aria-controls");

export function SlashMenu({
  getQuill,
  container,
  onAddAttachment,
  onRecordAudio,
  onAddLink,
  onDraw,
  onAddLiveImage,
  onAddFlowchart,
  onAddScan,
}: SlashMenuProps) {
  const t = useTranslations("editor.slashMenu");
  const [slash, setSlash] = React.useState<Slash | null>(null);
  const [place, setPlace] = React.useState<Place | null>(null);
  const [searchHint, setSearchHint] = React.useState<Place | null>(null);
  const [active, setActive] = React.useState(0);
  const [keyboard, setKeyboard] = React.useState(false);
  const [above, setAbove] = React.useState(false);
  const slashRef = React.useRef<Slash | null>(null);
  const menu = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  const items = React.useMemo(
    () =>
      findSlashItems(
        ITEMS.map((item) => ({
          ...item,
          label: t(`items.${item.kind}`),
          keywords: t(`keywords.${item.kind}`),
        })).filter(
          (item) =>
            (item.kind !== "attachment" || onAddAttachment) &&
            (item.kind !== "record" || onRecordAudio) &&
            (item.kind !== "draw" || onDraw) &&
            (item.kind !== "live" || onAddLiveImage) &&
            (item.kind !== "flowchart" || onAddFlowchart) &&
            (item.kind !== "scan" || onAddScan),
        ),
        slash?.query ?? "",
      ),
    [
      t,
      slash?.query,
      onAddAttachment,
      onRecordAudio,
      onDraw,
      onAddLiveImage,
      onAddFlowchart,
      onAddScan,
    ],
  );
  const activeIndex = Math.min(active, Math.max(0, items.length - 1));

  const updateSlash = React.useCallback((next: Slash | null) => {
    slashRef.current = next;
    setSlash(next);
  }, []);

  const placeAt = React.useCallback(
    (quill: QuillInstance, index: number): Place | null => {
      if (!container) return null;
      const bounds = quill.getBounds(index);
      if (!bounds) return null;
      const box = container.getBoundingClientRect();
      const editorBox = quill.container.getBoundingClientRect();
      return {
        top: editorBox.top - box.top + bounds.top,
        left: editorBox.left - box.left + bounds.left,
        height: bounds.height,
      };
    },
    [container],
  );

  React.useEffect(() => {
    if (!container) return;
    let quill: QuillInstance | null = null;

    const update = (typed: boolean) => {
      if (!quill) return;
      const selection = quill.getSelection();
      if (!selection || selection.length) {
        updateSlash(null);
        setSearchHint(null);
        return;
      }
      const [line, offset] = quill.getLine(selection.index);
      if (!line) return;
      const start = selection.index - offset;
      const format = line.formats();
      const current = slashRef.current;
      if (current) {
        const command =
          current.index >= start && current.index < selection.index
            ? quill.getText(current.index, selection.index - current.index)
            : "";
        const query = command.slice(1);
        if (!command.startsWith("/") || /^\s/.test(query) || query.length > 24)
          updateSlash(null);
        else if (query !== current.query) {
          updateSlash({ index: current.index, query });
          setActive(0);
        }
      } else if (typed && offset > 0 && !format["code-block"]) {
        const before = quill.getText(start, offset);
        if (before.endsWith("/") && /^\s?$/.test(before.slice(-2, -1))) {
          const index = selection.index - 1;
          updateSlash({ index, query: "" });
          setActive(0);
          setKeyboard(false);
          setPlace(placeAt(quill, index));
        }
      }
      const isAtLineEnd = offset === line.length() - 1;
      setSearchHint(
        slashRef.current && !slashRef.current.query && isAtLineEnd
          ? placeAt(quill, selection.index)
          : null,
      );
    };

    const onChange = (name: string, ...args: unknown[]) => {
      if (name === "text-change") {
        const [delta, , source] = args as [
          { ops: { insert?: unknown }[] },
          unknown,
          string,
        ];
        const typed =
          source === "user" && delta.ops.some((op) => op.insert === "/");
        // Quill settles the selection after the change.
        queueMicrotask(() => update(typed));
      } else update(false);
    };

    // Quill is rebuilt under the same box in strict mode; follow the current one.
    const attach = () => {
      const next = getQuill();
      if (next === quill) return;
      quill?.off("editor-change", onChange);
      quill = next;
      quill?.on("editor-change", onChange);
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(container, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      quill?.off("editor-change", onChange);
    };
  }, [container, getQuill, placeAt, updateSlash]);

  const pick = React.useCallback(
    (kind: Kind) => {
      const quill = getQuill();
      const current = slashRef.current;
      const item = ITEMS.find((i) => i.kind === kind);
      if (!quill || !current || !item) return;
      updateSlash(null);
      setSearchHint(null);
      const [line, offset] = quill.getLine(current.index);
      if (!line) return;
      const length = 1 + current.query.length;
      const end = current.index + length;
      const lineEnd = current.index - offset + line.length() - 1;
      const formats = line.formats();
      const dropsSpace =
        !!item.format &&
        offset > 1 &&
        quill.getText(current.index - 1, 1) === " " &&
        (end === lineEnd || quill.getText(end, 1) === " ");
      const from = dropsSpace ? current.index - 1 : current.index;
      quill.history.cutoff();
      quill.deleteText(from, end - from, "user");
      if (kind === "date") {
        const date = formatDate(
          new Date(),
          usePreferencesStore.getState().editor.dateFormat,
        );
        quill.insertText(from, date, "user");
        quill.history.cutoff();
        quill.setSelection(from + date.length, 0, "user");
        return;
      }
      if (!item.format) {
        quill.history.cutoff();
        quill.setSelection(from, 0, "silent");
        if (kind === "attachment") onAddAttachment?.();
        else if (kind === "record") onRecordAudio?.();
        else if (kind === "draw") onDraw?.();
        else if (kind === "live") onAddLiveImage?.();
        else if (kind === "flowchart") onAddFlowchart?.();
        else if (kind === "scan") onAddScan?.();
        else if (kind === "link") onAddLink();
        return;
      }
      const newLineEnd = lineEnd - (end - from);
      quill.updateContents(
        {
          ops: [
            ...(newLineEnd ? [{ retain: newLineEnd }] : []),
            { retain: 1, attributes: lineFormatChange(formats, item.format) },
          ],
        },
        "user",
      );
      quill.history.cutoff();
      quill.setSelection(from, 0, "user");
    },
    [
      getQuill,
      onAddAttachment,
      onRecordAudio,
      onAddLink,
      onDraw,
      onAddLiveImage,
      onAddFlowchart,
      onAddScan,
      updateSlash,
    ],
  );

  // Keys go to the menu before the editor sees them.
  React.useEffect(() => {
    if (!container || !slash) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const move = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (e.key === "Escape") {
        updateSlash(null);
        setSearchHint(null);
      } else if (!items.length) return;
      else if (move) {
        setKeyboard(true);
        setActive(
          (prev) =>
            (Math.min(prev, items.length - 1) + move + items.length) %
            items.length,
        );
      } else if (e.key === "Enter" || e.key === "Tab")
        pick(items[activeIndex].kind);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    container.addEventListener("keydown", onKey, true);
    return () => container.removeEventListener("keydown", onKey, true);
  }, [container, slash, items, activeIndex, pick, updateSlash]);

  React.useEffect(() => {
    if (slash && !items.length && /\s$/.test(slash.query)) updateSlash(null);
  }, [slash, items.length, updateSlash]);

  React.useEffect(() => {
    const root = getQuill()?.root;
    if (!root) return;
    if (!slash || !items.length) {
      root.removeAttribute("aria-activedescendant");
      root.removeAttribute("aria-controls");
      return;
    }
    root.setAttribute("aria-controls", listId);
    root.setAttribute("aria-activedescendant", `${listId}-${activeIndex}`);
  }, [slash, items.length, activeIndex, listId, getQuill]);

  React.useLayoutEffect(() => {
    if (!slash || !menu.current || !container || !place) return;
    const menuHeight = menu.current.offsetHeight + 14;
    const lineTop = container.getBoundingClientRect().top + place.top;
    const toolbarHeight = isPhoneWidth() ? 64 : 0;
    setAbove(
      window.innerHeight - toolbarHeight - (lineTop + place.height) <
        menuHeight && lineTop > menuHeight,
    );
  }, [slash, place, container]);

  return (
    <>
      {searchHint && slash && (
        <span
          aria-hidden
          className="slash-hint"
          style={{
            top: searchHint.top,
            left: searchHint.left,
            height: searchHint.height,
            lineHeight: `${searchHint.height}px`,
          }}
        >
          {t("typeToSearch")}
        </span>
      )}
      {slash && place && (
        // biome-ignore lint/a11y/noStaticElementInteractions: keeps the caret in the note when the menu is pressed
        <div
          ref={menu}
          className={cn(
            menuSurface,
            "absolute z-(--z-float) grid w-62.5 max-w-[calc(100%-8px)] gap-px rounded-menu p-1.5 animate-pop-in",
          )}
          style={
            above
              ? {
                  bottom: `calc(100% - ${place.top}px + 6px)`,
                  left: place.left,
                }
              : { top: place.top + place.height + 6, left: place.left }
          }
          onMouseDown={(e) => e.preventDefault()}
        >
          {items.length ? (
            <div
              role="listbox"
              id={listId}
              aria-label={t("label")}
              className="grid gap-px"
            >
              {items.map((item, i) => (
                // biome-ignore lint/a11y/useKeyWithClickEvents: the note text drives the list by aria-activedescendant
                <div
                  key={item.kind}
                  id={`${listId}-${i}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={i === activeIndex}
                  data-kbd={(keyboard && i === activeIndex) || undefined}
                  data-highlighted={i === activeIndex ? "" : undefined}
                  onPointerMove={() => {
                    setKeyboard(false);
                    setActive(i);
                  }}
                  onClick={() => pick(item.kind)}
                  className={cn(
                    menuItem,
                    "data-kbd:after:absolute data-kbd:after:top-1/2 data-kbd:after:left-0.75 data-kbd:after:-mt-2 data-kbd:after:h-4 data-kbd:after:w-0.75 data-kbd:after:rounded-xs data-kbd:after:bg-accent-strong data-kbd:after:content-['']",
                  )}
                >
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>
          ) : (
            <div role="status" className="px-2 py-1.5 text-muted-foreground">
              {t("noResults")}
            </div>
          )}
          {items.length > 0 && (
            <div className="mt-1 flex items-center border-border/55 border-t px-1.5 pt-2 pb-0.5 text-caption text-muted-foreground max-md:hidden">
              <ShortcutHints
                groups={[
                  [["↑", "↓"], t("move")],
                  [["↵"], t("add")],
                ]}
                screenReaderText={t("keysHelp")}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
