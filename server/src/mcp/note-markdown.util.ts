import { QuillOp, parseDeltaOps } from '../import-export/markdown/delta-lines';
import { deltaToMarkdown } from '../import-export/markdown/delta-to-markdown';
import { markdownToDelta } from '../import-export/markdown/markdown-to-delta';

/** Formats deltaToMarkdown writes and markdownToDelta reads back. */
const MARKDOWN_FORMATS = new Set([
  'bold',
  'italic',
  'underline',
  'strike',
  'highlight',
  'link',
  'header',
  'list',
  'indent',
  'blockquote',
  'code-block',
]);

const MARKDOWN_HIGHLIGHTS = ['yellow', 'green', 'blue', 'pink', 'purple'];

/** A note's text as markdown; plain text that isn't a Delta comes back as is. */
export function noteContentToMarkdown(content: string | null): string {
  if (!content) return '';
  const ops = parseDeltaOps(content);
  return ops ? deltaToMarkdown(ops) : content;
}

export function markdownToNoteContent(markdown: string): string {
  return JSON.stringify(markdownToDelta(markdown));
}

/** The note's content with [markdown] added as new lines at the end. */
export function appendMarkdownToContent(
  content: string | null,
  markdown: string,
): string {
  const added = markdownToDelta(markdown).ops;
  const ops = parseDeltaOps(content);
  if (ops) {
    return JSON.stringify({ ops: [...withoutBlankEnd(ops), ...added] });
  }
  const text = content?.trim() ? `${content.trimEnd()}\n` : '';
  return JSON.stringify({
    ops: [...(text ? [{ insert: text }] : []), ...added],
  });
}

/**
 * Whether rewriting the note from its markdown keeps everything in it:
 * pictures in the text, colours, fonts, custom highlights and aligned
 * paragraphs would be lost.
 */
export function markdownCanCarry(content: string | null): boolean {
  const ops = parseDeltaOps(content);
  if (!ops) return true;
  return ops.every(
    (op) =>
      typeof op.insert === 'string' &&
      Object.entries(op.attributes ?? {}).every(
        ([name, value]) =>
          // Left is how a line lies anyway.
          (name === 'align' && (value === 'left' || !value)) ||
          (MARKDOWN_FORMATS.has(name) &&
            (name !== 'highlight' ||
              (typeof value === 'string' &&
                MARKDOWN_HIGHLIGHTS.includes(value)))),
      ),
  );
}

/** Drops the lone empty line a blank note is made of. */
function withoutBlankEnd(ops: QuillOp[]): QuillOp[] {
  if (ops.length === 1 && ops[0].insert === '\n' && !ops[0].attributes) {
    return [];
  }
  return ops;
}
