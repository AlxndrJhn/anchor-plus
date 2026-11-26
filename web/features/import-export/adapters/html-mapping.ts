import type { QuillDelta, QuillOp } from "@/features/notes/quill";
import { MAX_LIST_INDENT } from "@/features/notes/quill-lines";
import { finishDelta } from "./shared";

/**
 * Turns note HTML (Evernote's ENML, Joplin's HTML notes, rich text from
 * Standard Notes) into a Quill Delta. Only what the editor can show is
 * kept: headings, lists and checklists, quotes, code, and bold, italic,
 * underline, strike, highlight and links. Pictures and other files come in
 * as attachments, so their tags are dropped here.
 */

type Marks = Record<string, unknown>;
type LineAttrs = Record<string, unknown>;

type Context = {
  marks: Marks;
  line: LineAttrs;
  /** Nested lists: the type of each, outermost first */
  lists: { type: "bullet" | "ordered" | "check" }[];
  pre: boolean;
};

const MAX_HEADER = 3;

const SKIPPED = new Set([
  "HEAD",
  "SCRIPT",
  "STYLE",
  "TITLE",
  "META",
  "LINK",
  "TEMPLATE",
  "NOSCRIPT",
  "IMG",
  "EN-MEDIA",
  "EN-CRYPT",
  "OBJECT",
  "IFRAME",
  "SVG",
  "VIDEO",
  "AUDIO",
]);

const BLOCKS = new Set([
  "P",
  "DIV",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "MAIN",
  "ASIDE",
  "NAV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "DL",
  "DT",
  "DD",
  "FIGURE",
  "FIGCAPTION",
  "ADDRESS",
  "EN-NOTE",
  "BODY",
  "HR",
  "DETAILS",
  "SUMMARY",
]);

const sameAttributes = (a: Marks, b: Marks) =>
  JSON.stringify(a) === JSON.stringify(b);

const styleOf = (element: Element) =>
  (element.getAttribute("style") ?? "").toLowerCase().replace(/\s+/g, "");

const SAFE_LINK = /^(https?:|mailto:|tel:|evernote:|onenote:|obsidian:)/i;

class DeltaBuilder {
  ops: QuillOp[] = [];
  private lineOps: QuillOp[] = [];
  /** Set by a checkbox inside the line, overriding the context's list type */
  private checked: boolean | null = null;

  hasContent() {
    return this.lineOps.some(
      (op) => typeof op.insert === "string" && op.insert.trim(),
    );
  }

  text(value: string, marks: Marks, pre: boolean) {
    let text = value;
    if (!pre) {
      // \s takes in &nbsp; too, which note apps use for ordinary spaces
      text = text.replace(/\s+/g, " ");
      if (!this.lineOps.length || this.endsWithSpace()) {
        text = text.replace(/^ +/, "");
      }
    }
    if (!text) return;
    const last = this.lineOps[this.lineOps.length - 1];
    if (
      last &&
      typeof last.insert === "string" &&
      sameAttributes(last.attributes ?? {}, marks)
    ) {
      last.insert += text;
      return;
    }
    this.lineOps.push(
      Object.keys(marks).length
        ? { insert: text, attributes: { ...marks } }
        : { insert: text },
    );
  }

  private endsWithSpace() {
    const last = this.lineOps[this.lineOps.length - 1];
    return typeof last?.insert === "string" && /[  ]$/.test(last.insert);
  }

  check(checked: boolean) {
    this.checked = checked;
  }

  /** Ends the current line; an empty one only when [force] is set. */
  endLine(attrs: LineAttrs, force = false) {
    if (!force && !this.hasContent() && this.checked === null) {
      this.lineOps = [];
      return;
    }
    // Spaces at the end of a line carry nothing
    const last = this.lineOps[this.lineOps.length - 1];
    if (typeof last?.insert === "string" && !attrs["code-block"]) {
      last.insert = last.insert.replace(/ +$/, "");
      if (!last.insert) this.lineOps.pop();
    }
    let line = attrs;
    if (this.checked !== null) {
      line = { ...attrs, list: this.checked ? "checked" : "unchecked" };
    }
    this.ops.push(...this.lineOps);
    this.ops.push(
      Object.keys(line).length
        ? { insert: "\n", attributes: { ...line } }
        : { insert: "\n" },
    );
    this.lineOps = [];
    this.checked = null;
  }
}

function inlineMarks(element: Element, marks: Marks): Marks {
  const next = { ...marks };
  const tag = element.tagName;
  const style = styleOf(element);

  if (
    tag === "B" ||
    tag === "STRONG" ||
    /font-weight:(bold|[6-9]00)/.test(style)
  )
    next.bold = true;
  if (tag === "I" || tag === "EM" || style.includes("font-style:italic"))
    next.italic = true;
  if (tag === "U" || style.includes("underline")) next.underline = true;
  if (
    tag === "S" ||
    tag === "STRIKE" ||
    tag === "DEL" ||
    style.includes("line-through")
  )
    next.strike = true;
  if (
    tag === "MARK" ||
    style.includes("--en-highlight") ||
    /background(-color)?:(yellow|#ff[ef][0-9a-f]{3})/.test(style)
  )
    next.highlight = "yellow";
  if (tag === "A") {
    const href = element.getAttribute("href")?.trim();
    if (href && SAFE_LINK.test(href)) {
      next.link = href;
      delete next.underline;
    }
  }
  return next;
}

function walk(node: Node, ctx: Context, out: DeltaBuilder) {
  if (node.nodeType === 3) {
    out.text(node.nodeValue ?? "", ctx.marks, ctx.pre);
    return;
  }
  if (node.nodeType !== 1) return;

  const element = node as Element;
  const tag = element.tagName.toUpperCase();
  if (SKIPPED.has(tag)) {
    // The HTML parser does not close <en-media/>, so text after it ends up inside
    if (tag === "EN-MEDIA" || tag === "IMG") walkChildren(element, ctx, out);
    return;
  }

  if (tag === "BR") {
    if (ctx.pre) out.text("\n", ctx.marks, true);
    else out.endLine(ctx.line, true);
    return;
  }

  if (tag === "EN-TODO") {
    out.check(element.getAttribute("checked") === "true");
    walkChildren(element, ctx, out);
    return;
  }
  if (tag === "INPUT") {
    if ((element.getAttribute("type") ?? "").toLowerCase() === "checkbox") {
      out.check(element.hasAttribute("checked"));
    }
    return;
  }

  if (!BLOCKS.has(tag)) {
    walkChildren(
      element,
      { ...ctx, marks: inlineMarks(element, ctx.marks) },
      out,
    );
    if (tag === "TD" || tag === "TH") out.text(" ", ctx.marks, false);
    return;
  }

  if (tag === "HR") {
    out.endLine(ctx.line);
    return;
  }

  const style = styleOf(element);
  const next: Context = {
    ...ctx,
    marks: { ...ctx.marks },
    line: { ...ctx.line },
    lists: ctx.lists,
  };

  // What came before this block ends here
  out.endLine(ctx.line);

  if (/^H[1-6]$/.test(tag)) {
    next.line = { header: Math.min(Number(tag[1]), MAX_HEADER) };
  } else if (tag === "BLOCKQUOTE") {
    next.line = { blockquote: true };
  } else if (tag === "PRE" || style.includes("-en-codeblock:true")) {
    next.line = { "code-block": true };
    next.pre = true;
  } else if (tag === "UL" || tag === "OL") {
    const type =
      tag === "OL"
        ? "ordered"
        : style.includes("--en-todo:true") ||
            element.getAttribute("data-checked") !== null
          ? "check"
          : "bullet";
    next.lists = [...ctx.lists, { type }];
  } else if (tag === "LI") {
    const list = ctx.lists[ctx.lists.length - 1] ?? { type: "bullet" };
    const level = Math.min(Math.max(ctx.lists.length - 1, 0), MAX_LIST_INDENT);
    const checked =
      style.includes("--en-checked:true") ||
      element.getAttribute("data-checked") === "true" ||
      element.classList.contains("checked");
    next.line = {
      list:
        list.type === "check" ? (checked ? "checked" : "unchecked") : list.type,
      ...(level ? { indent: level } : {}),
    };
  }

  if (next.pre) {
    walkPre(element, next, out);
  } else {
    walkChildren(element, next, out);
  }
  out.endLine(next.line);
}

function walkChildren(element: Element, ctx: Context, out: DeltaBuilder) {
  for (const child of Array.from(element.childNodes)) walk(child, ctx, out);
}

/** Code keeps its spacing; each of its lines becomes a code line. */
function walkPre(element: Element, ctx: Context, out: DeltaBuilder) {
  // Evernote code blocks hold one <div> per line
  const text = blockText(element).replace(/\n$/, "");
  for (const line of text.split("\n")) {
    out.text(line, {}, true);
    out.endLine(ctx.line, true);
  }
}

function blockText(node: Node): string {
  if (node.nodeType === 3) return node.nodeValue ?? "";
  if (node.nodeType !== 1) return "";
  const element = node as Element;
  if (element.tagName === "BR") return "\n";
  const inner = Array.from(element.childNodes).map(blockText).join("");
  return element.tagName === "DIV" || element.tagName === "P"
    ? inner.endsWith("\n")
      ? inner
      : `${inner}\n`
    : inner;
}

/** Merges consecutive empty lines into one and drops them at both ends. */
function tidy(ops: QuillOp[]): QuillOp[] {
  const endsLine = (op: QuillOp | undefined) =>
    op === undefined ||
    (typeof op.insert === "string" && op.insert.endsWith("\n"));
  const isBlankLine = (op: QuillOp, previous: QuillOp | undefined) =>
    op.insert === "\n" && !op.attributes && endsLine(previous);

  const out: QuillOp[] = [];
  let previousBlank = false;
  for (const op of ops) {
    const blank = isBlankLine(op, out[out.length - 1]);
    if (blank && (out.length === 0 || previousBlank)) continue;
    previousBlank = blank;
    out.push(op);
  }
  while (
    out.length > 1 &&
    isBlankLine(out[out.length - 1], out[out.length - 2])
  ) {
    out.pop();
  }
  return out;
}

export function htmlToDelta(html: string): QuillDelta {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root =
    doc.body.querySelector("en-note") ?? doc.body ?? doc.documentElement;
  const out = new DeltaBuilder();
  walkChildren(root, { marks: {}, line: {}, lists: [], pre: false }, out);
  out.endLine({});
  return finishDelta(tidy(out.ops));
}
