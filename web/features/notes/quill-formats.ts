import { HIGHLIGHTS } from "@/lib/design/tokens";
import { translate } from "@/lib/i18n";
import {
  FLOWCHART_EMBED,
  flowchartLabel,
  flowchartSvg,
  parseFlowchart,
} from "./flowcharts";
import { INLINE_IMAGE_EMBED, parseInlineImage } from "./inline-images";
import { LINK_PROTOCOLS } from "./link-utils";
import { LIVE_IMAGE_EMBED, parseLiveImage } from "./live-images";
import { deleteWholeLines, isWholeLines, type QuillInstance } from "./quill";
import { MAX_LIST_INDENT } from "./quill-lines";
import { pagesLabel, parseScan, SCAN_EMBED, scanTitle } from "./scans";
import { FONTS, inkFor, isHexColor } from "./text-style";

type QuillStatic = {
  import: (path: string) => unknown;
  register: (
    target: unknown,
    moduleOrOverwrite?: unknown,
    overwrite?: boolean,
  ) => void;
};

type Range = { index: number; length: number };
type Formats = Record<string, unknown>;

let registered = false;

const isHighlight = (value: unknown): value is (typeof HIGHLIGHTS)[number] =>
  (HIGHLIGHTS as readonly unknown[]).includes(value);

/** Highlights are <mark class="hl" data-hl="<name>">, read by lib/highlight-paint.ts. */
export function registerNoteFormats(Quill: QuillStatic) {
  if (registered) return;
  registered = true;
  const Inline = Quill.import("blots/inline") as {
    new (...args: never[]): object;
    create(value: unknown): HTMLElement;
  };
  class Highlight extends Inline {
    static blotName = "highlight";
    static tagName = "MARK";
    static className = "hl";
    static create(value: unknown) {
      // biome-ignore lint/complexity/noThisInStatic: Parchment's create reads this.tagName
      const node = super.create(value);
      if (isHexColor(value)) {
        // A picked colour, rather than one of the named ones.
        node.setAttribute("data-hl", "custom");
        node.style.setProperty("--hl-custom", value);
        node.style.setProperty("--hl-custom-ink", inkFor(value));
      } else
        node.setAttribute("data-hl", isHighlight(value) ? value : "yellow");
      return node;
    }
    static formats(node: HTMLElement) {
      const name = node.getAttribute("data-hl");
      if (name === "custom") {
        const color = node.style.getPropertyValue("--hl-custom").trim();
        return isHexColor(color) ? color : undefined;
      }
      return isHighlight(name) ? name : undefined;
    }
  }
  Quill.register(Highlight, true);

  // A picture placed in the text on Android. Kept as it came, so editing the
  // note here never drops it; the picture loads in showInlineImages.
  const Embed = Quill.import("blots/embed") as {
    new (...args: never[]): object;
    create(value: unknown): HTMLElement;
  };
  class NoteImage extends Embed {
    static blotName = INLINE_IMAGE_EMBED;
    static tagName = "SPAN";
    static className = "note-image";
    static create(value: unknown) {
      // biome-ignore lint/complexity/noThisInStatic: Parchment's create reads this.tagName
      const node = super.create(value);
      node.setAttribute("data-value", typeof value === "string" ? value : "");
      const image = parseInlineImage(value);
      if (!image) return node;
      node.dataset.id = image.id;
      if (image.width)
        node.style.setProperty("--note-image-width", `${image.width * 100}%`);
      const img = document.createElement("img");
      // Never empty: the picture is part of the note, not decoration.
      img.alt =
        image.caption?.trim() || translate("noteHooks.quillFormats")("picture");
      img.draggable = false;
      node.appendChild(img);
      if (image.caption) {
        const caption = document.createElement("span");
        caption.className = "note-image-caption";
        caption.textContent = image.caption;
        node.appendChild(caption);
      }
      return node;
    }
    static value(node: HTMLElement) {
      return node.getAttribute("data-value") ?? "";
    }
  }
  Quill.register(NoteImage, true);

  // A camera or screen shown live (see live-hub.ts); its video is attached
  // in useLiveImages, the stored value kept as it came.
  class LiveImageEmbed extends Embed {
    static blotName = LIVE_IMAGE_EMBED;
    static tagName = "SPAN";
    static className = "live-image";
    static create(value: unknown) {
      // biome-ignore lint/complexity/noThisInStatic: Parchment's create reads this.tagName
      const node = super.create(value);
      node.setAttribute("data-value", typeof value === "string" ? value : "");
      const image = parseLiveImage(value);
      if (!image) return node;
      node.dataset.id = image.id;
      node.dataset.source = image.source;
      if (image.width)
        node.style.setProperty("--note-image-width", `${image.width * 100}%`);
      const frame = document.createElement("span");
      frame.className = "live-frame";
      const video = document.createElement("video");
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute(
        "aria-label",
        translate("noteHooks.quillFormats")(
          image.source === "screen" ? "liveScreen" : "liveCamera",
        ),
      );
      frame.appendChild(video);
      const status = document.createElement("span");
      status.className = "live-status";
      frame.appendChild(status);
      // The red dot, which a tap turns into an anchor and back; then how
      // many watch (use-live-images.ts fills it in).
      const badge = document.createElement("span");
      badge.className = "live-badge";
      badge.innerHTML =
        '<span class="live-mark" aria-hidden="true"><span class="live-dot"></span>' +
        '<svg class="live-anchor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/></svg></span>' +
        `<span class="live-word">${translate("noteHooks.quillFormats")("live")}</span><span class="live-viewers" hidden></span>`;
      frame.appendChild(badge);
      node.appendChild(frame);
      return node;
    }
    static value(node: HTMLElement) {
      return node.getAttribute("data-value") ?? "";
    }
  }
  Quill.register(LiveImageEmbed, true);

  // A flowchart, drawn from its stored value; flowchart-tools.tsx opens it
  // to edit. Kept as it came, so the value survives a round trip.
  class FlowchartEmbed extends Embed {
    static blotName = FLOWCHART_EMBED;
    static tagName = "SPAN";
    static className = "flowchart";
    static create(value: unknown) {
      // biome-ignore lint/complexity/noThisInStatic: Parchment's create reads this.tagName
      const node = super.create(value);
      node.setAttribute("data-value", typeof value === "string" ? value : "");
      const chart = parseFlowchart(value);
      if (!chart) return node;
      const frame = document.createElement("span");
      frame.className = "flowchart-frame";
      frame.innerHTML = flowchartSvg(chart, flowchartLabel(chart));
      node.appendChild(frame);
      return node;
    }
    static value(node: HTMLElement) {
      return node.getAttribute("data-value") ?? "";
    }
  }
  Quill.register(FlowchartEmbed, true);

  // A scanned document: its title, page count and pages drawn small
  // (scan-render.ts showScans fills them in); scan-tools.tsx opens it.
  class ScanEmbed extends Embed {
    static blotName = SCAN_EMBED;
    static tagName = "SPAN";
    static className = "scan";
    static create(value: unknown) {
      // biome-ignore lint/complexity/noThisInStatic: Parchment's create reads this.tagName
      const node = super.create(value);
      node.setAttribute("data-value", typeof value === "string" ? value : "");
      const scan = parseScan(value);
      if (!scan) return node;
      const card = document.createElement("span");
      card.className = "scan-card";
      const head = document.createElement("span");
      head.className = "scan-head";
      const title = document.createElement("span");
      title.className = "scan-title";
      title.textContent = scanTitle(scan);
      const count = document.createElement("span");
      count.className = "scan-count";
      count.textContent = pagesLabel(scan.pages.length);
      const pdf = document.createElement("button");
      pdf.type = "button";
      pdf.className = "scan-pdf";
      pdf.textContent = "PDF";
      pdf.title = translate("noteHooks.quillFormats")("downloadPdf");
      pdf.setAttribute(
        "aria-label",
        translate("noteHooks.quillFormats")("downloadPdf"),
      );
      pdf.contentEditable = "false";
      head.append(title, count, pdf);
      const pages = document.createElement("span");
      pages.className = "scan-pages";
      for (const _ of scan.pages.slice(0, 6)) {
        const img = document.createElement("img");
        img.alt = "";
        img.draggable = false;
        pages.appendChild(img);
      }
      if (scan.pages.length > 6) {
        const more = document.createElement("span");
        more.className = "scan-more";
        more.textContent = `+${scan.pages.length - 6}`;
        pages.appendChild(more);
      }
      card.append(head, pages);
      node.appendChild(card);
      return node;
    }
    static value(node: HTMLElement) {
      return node.getAttribute("data-value") ?? "";
    }
  }
  Quill.register(ScanEmbed, true);

  // A font for the selected text, written as its font-family.
  const FontStyle = Quill.import("attributors/style/font") as {
    whitelist: string[] | null;
  };
  FontStyle.whitelist = FONTS.map((font) => font.value);
  Quill.register(FontStyle, true);

  const Delta = Quill.import("delta") as DeltaStatic;
  const Clipboard = Quill.import("modules/clipboard") as {
    new (
      ...args: never[]
    ): {
      quill: ClipboardQuill;
      onCaptureCopy(e: ClipboardEvent, isCut?: boolean): void;
      onCopy(range: Range, isCut?: boolean): { html: string; text: string };
      normalizeHTML(doc: Document): void;
      convertHTML(html: string): DeltaInstance;
    };
  };
  class NoteClipboard extends Clipboard {
    onCaptureCopy(e: ClipboardEvent, isCut = false) {
      const quill = this.quill as unknown as QuillInstance;
      const range = quill.getSelection();
      if (range && !range.length) return;
      if (
        !isCut ||
        e.defaultPrevented ||
        !range ||
        !isWholeLines(quill, range)
      ) {
        super.onCaptureCopy(e, isCut);
        return;
      }
      e.preventDefault();
      const { html, text } = this.onCopy(range, true);
      e.clipboardData?.setData("text/plain", text);
      e.clipboardData?.setData("text/html", html);
      deleteWholeLines(quill, range);
    }

    onCopy(range: Range, isCut = false) {
      const { html, text } = super.onCopy(range, isCut);
      // Quill writes every space as &nbsp;, which other apps won't wrap at.
      const spaced = html.replace(/(?<=[^\s>;])&nbsp;(?=[^\s<&])/g, " ");
      return { html: `${COPY_MARK}${spaced}`, text };
    }

    normalizeHTML(doc: Document) {
      super.normalizeHTML(doc);
      keepPreformattedSpaces(doc);
    }

    onPaste(range: Range, data: { text?: string; html?: string }) {
      const quill = this.quill;
      const text = data.text?.replace(/\r\n?/g, "\n");
      const { html } = data;
      const formats = quill.getFormat(range.index);
      const line = pick(formats, (key) => LINE_FORMATS.includes(key));
      const [caretLine, offset] = quill.getLine(range.index);
      const hasTextBefore = offset > 0;
      const isLineEmpty = (caretLine?.length() ?? 1) <= 1;
      const before = formats.link;
      const after = quill.getFormat(range.index + range.length, 1).link;
      // Quill gives pasted text the link at the caret; keep it only inside a link.
      const keepsLink = !!before && before === after;
      const inline = pick(
        formats,
        (key) => !LINE_FORMATS.includes(key) && (keepsLink || key !== "link"),
      );

      const [endLine, endOffset] = quill.getLine(range.index + range.length);
      const rest = (endLine?.length() ?? 1) - 1 - endOffset;
      let pasted: DeltaInstance;
      let lastLine: Formats = {};
      if (formats["code-block"]) {
        pasted = new Delta().insert(text || plainText(html ?? ""), {
          "code-block": formats["code-block"],
        });
      } else if (html) {
        pasted = this.convertHTML(html);
        const last = pasted.ops[pasted.ops.length - 1];
        const lastFormats = cleanLine(last?.attributes ?? {});
        // Only Anchor's own copies say whether their last line was whole.
        const isAnchorCopy = html.includes("data-anchor-copy");
        const isPartial = isAnchorCopy && !!text && !text.endsWith("\n");
        const dropsBreak = isAnchorCopy
          ? isPartial || rest === 0
          : rest === 0 || !Object.keys(lastFormats).length;
        if (
          typeof last?.insert === "string" &&
          last.insert.endsWith("\n") &&
          dropsBreak
        ) {
          pasted = pasted.compose(
            new Delta().retain(pasted.length() - 1).delete(1),
          );
          if (isPartial || rest === 0) lastLine = lastFormats;
        }
        pasted = formatLines(pasted, { line, hasTextBefore, inline: {} });
      } else {
        pasted = formatLines(new Delta().insert(text ?? ""), {
          line,
          hasTextBefore,
          inline,
          next: nextLineOf(line),
        });
      }

      const hasBreak = pasted.ops.some(
        (op) => typeof op.insert === "string" && op.insert.includes("\n"),
      );
      let tail: Formats =
        endLine && endLine !== caretLine && endOffset > 0
          ? { ...clearing(endLine.formats()), ...line }
          : {};
      if (!formats["code-block"] && !(offset === 0 && rest > 0)) {
        if (Object.keys(lastLine).length && (hasBreak || isLineEmpty))
          tail = { ...tail, ...clearing(line), ...lastLine };
        else if (hasBreak) tail = { ...tail, ...nextLineChange(line) };
      }
      const change = new Delta()
        .retain(range.index)
        .delete(range.length)
        .concat(pasted);
      if (Object.keys(tail).length) change.retain(rest).retain(1, tail);
      const end = range.index + pasted.length();
      quill.history.cutoff();
      quill.updateContents(change, "user");
      quill.history.cutoff();
      quill.setSelection(end, 0, "silent");
      quill.scrollSelectionIntoView();
    }
  }

  function formatLines(
    pasted: DeltaInstance,
    options: {
      line: Formats;
      hasTextBefore: boolean;
      inline: Formats;
      next?: Formats;
    },
  ): DeltaInstance {
    const { line, hasTextBefore, inline, next = {} } = options;
    const out = new Delta();
    let isFirst = true;
    for (const op of pasted.ops) {
      if (typeof op.insert !== "string") {
        out.insert(op.insert, op.attributes);
        continue;
      }
      const own = op.attributes ?? {};
      const ownLine = cleanLine(own);
      const hasOwnLine = Object.keys(ownLine).length > 0;
      const textFormats = { ...inline, ...cleanInline(own) };
      op.insert.split("\n").forEach((part, i) => {
        if (i > 0) {
          const lineFormats = isFirst
            ? hasOwnLine && !(hasTextBefore && Object.keys(line).length)
              ? ownLine
              : line
            : hasOwnLine
              ? ownLine
              : next;
          out.insert("\n", lineFormats);
          isFirst = false;
        }
        if (part) out.insert(part, textFormats);
      });
    }
    return out;
  }

  Quill.register("modules/clipboard", NoteClipboard, true);

  const Input = Quill.import("modules/input") as {
    new (
      ...args: never[]
    ): {
      quill: QuillInstance;
      deleteRange(range: Range): void;
    };
  };
  class NoteInput extends Input {
    replaceText(range: Range, text = "") {
      if (!range.length) return false;
      const quill = this.quill;
      const formats = text ? typedFormats(quill, range) : {};
      this.deleteRange(range);
      if (text)
        quill.updateContents(
          new Delta().retain(range.index).insert(text, formats),
          "user",
        );
      quill.setSelection(range.index + text.length, 0, "silent");
      return true;
    }

    handleCompositionStart() {
      const quill = this.quill;
      const range = quill.getSelection();
      if (!range?.length) return;
      const formats = pick(
        typedFormats(quill, range),
        (key) => !LINE_FORMATS.includes(key),
      );
      this.replaceText(range);
      for (const [name, value] of Object.entries(formats))
        quill.format(name, value, "silent");
    }
  }
  Quill.register("modules/input", NoteInput, true);

  const History = Quill.import("modules/history") as {
    new (
      ...args: never[]
    ): {
      stack: { undo: unknown[] };
      cutoff(): void;
      undo(): void;
      record(change: unknown, old: unknown): void;
      restoreSelection(item: unknown): void;
    };
  };
  class NoteHistory extends History {
    private isKeepingSelection = false;

    record(change: unknown, old: unknown) {
      const count = this.stack.undo.length;
      super.record(change, old);
      // Quill drops a step that cancels out but keeps its start time.
      if (this.stack.undo.length < count) this.cutoff();
    }

    restoreSelection(item: unknown) {
      if (!this.isKeepingSelection) super.restoreSelection(item);
    }

    undoKeepingSelection() {
      this.isKeepingSelection = true;
      try {
        this.undo();
      } finally {
        this.isKeepingSelection = false;
      }
    }
  }
  Quill.register("modules/history", NoteHistory, true);

  const Link = Quill.import("formats/link") as {
    PROTOCOL_WHITELIST: string[];
  };
  Link.PROTOCOL_WHITELIST = LINK_PROTOCOLS;

  // Every line takes its direction from its own first letter, so a Hebrew or
  // Arabic line lays out right to left beside English ones. Paragraphs,
  // headings, quotes and list items all inherit Block.create; code stays LTR.
  // Splitting a line clones its node, so the new line keeps the attribute.
  const Block = Quill.import("blots/block") as {
    create(this: { blotName?: string }, value?: unknown): HTMLElement;
  };
  const createBlock = Block.create;
  Block.create = function (value) {
    const node = createBlock.call(this, value);
    if (this.blotName !== "code-block") node.setAttribute("dir", "auto");
    return node;
  };
}

function typedFormats(quill: QuillInstance, range: Range): Formats {
  const formats = quill.getFormat(range.index, 1);
  const after = quill.getFormat(range.index + range.length, 1).link;
  if (formats.link && formats.link !== after) delete formats.link;
  return formats;
}

type Op = { insert?: unknown; attributes?: Formats };
type DeltaInstance = {
  ops: Op[];
  length(): number;
  insert(insert: unknown, attributes?: Formats): DeltaInstance;
  retain(length: number, attributes?: Formats): DeltaInstance;
  delete(length: number): DeltaInstance;
  compose(other: DeltaInstance): DeltaInstance;
  concat(other: DeltaInstance): DeltaInstance;
};
type DeltaStatic = new () => DeltaInstance;
type ClipboardQuill = {
  getFormat: (index: number, length?: number) => Formats;
  getLine: (
    index: number,
  ) => [{ length: () => number; formats: () => Formats } | null, number];
  getSelection: () => Range | null;
  updateContents: (delta: DeltaInstance, source: "user") => void;
  setSelection: (index: number, length: number, source: "silent") => void;
  scrollSelectionIntoView: () => void;
  history: { cutoff: () => void };
};

const LINE_FORMATS = ["header", "list", "blockquote", "indent", "code-block"];

const COPY_MARK = '<span data-anchor-copy=""></span>';

/** Formats that switch each of `formats` off. */
const clearing = (formats: Formats): Formats =>
  Object.fromEntries(Object.keys(formats).map((key) => [key, null]));

const pick = (formats: Formats, keep: (key: string) => boolean): Formats =>
  Object.fromEntries(Object.entries(formats).filter(([key]) => keep(key)));

function nextLineOf(line: Formats): Formats {
  if (line.list)
    return {
      list: line.list === "checked" ? "unchecked" : line.list,
      ...(line.indent ? { indent: line.indent } : {}),
    };
  return line.blockquote ? { blockquote: true } : {};
}

function nextLineChange(line: Formats): Formats | null {
  if (line.header) return { header: false };
  if (line.list === "checked") return { list: "unchecked" };
  return null;
}

function cleanLine(formats: Formats): Formats {
  const line = pick(formats, (key) => LINE_FORMATS.includes(key));
  if (typeof line.indent === "number") {
    if (!line.list) delete line.indent;
    else line.indent = Math.min(line.indent, MAX_LIST_INDENT);
  }
  return line;
}

function cleanInline(formats: Formats): Formats {
  const inline = pick(formats, (key) => !LINE_FORMATS.includes(key));
  if (inline.link) delete inline.underline;
  return inline;
}

function plainText(html: string): string {
  return (
    new DOMParser().parseFromString(html, "text/html").body.textContent ?? ""
  );
}

/** Quill keeps spaces only inside <pre>; this keeps them in `white-space: pre` text too. */
function keepPreformattedSpaces(doc: Document) {
  for (const element of doc.body.querySelectorAll<HTMLElement>("[style]")) {
    if (!/^(pre|pre-wrap|break-spaces)$/.test(element.style.whiteSpace))
      continue;
    if (element.closest("pre")) continue;
    const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const lines = node.data
        .replace(/\t/g, "  ")
        .replace(/ /g, "\u00a0")
        .split("\n");
      if (lines.length === 1) {
        node.data = lines[0];
        continue;
      }
      const parts = lines.flatMap((text, i) =>
        i
          ? [doc.createElement("br"), doc.createTextNode(text)]
          : [doc.createTextNode(text)],
      );
      node.replaceWith(...parts);
    }
  }
}
