import { parseDeltaOps } from '../../import-export/markdown/delta-lines';

/**
 * What a chat app (WhatsApp, Signal, Slack…) shows for a share link: the
 * note's title and the start of its text, or the files on it when it has
 * neither. The share page's HTML carries it in its <title> and Open Graph
 * tags, which link previews read without running the page's script.
 */
export type ShareLinkPreview = { title: string; description: string };

/** About what a chat preview shows of a description. */
export const PREVIEW_TEXT_LENGTH = 80;
const SITE_NAME = 'Anchor+';
const FALLBACK_TITLE = 'Shared note';
const FALLBACK_DESCRIPTION = 'A note shared from Anchor+';
/** File names past this many are only counted. */
const NAMED_FILES = 3;

/** A note's text without formatting, lines kept apart by spaces. */
export function noteContentToPlainText(content: string | null): string {
  if (!content) return '';
  const ops = parseDeltaOps(content);
  const text = ops
    ? ops
        .map((op) => (typeof op.insert === 'string' ? op.insert : ' '))
        .join('')
    : content;
  return text.replace(/\s+/g, ' ').trim();
}

/** Cut at a word where one is near, with "…" when anything was left out. */
export function truncatePreviewText(
  text: string,
  max = PREVIEW_TEXT_LENGTH,
): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const cut = chars.slice(0, max).join('');
  const space = cut.lastIndexOf(' ');
  const end = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${end.replace(/[\s.,;:!?-]+$/, '')}…`;
}

function describeFiles(names: string[]): string {
  if (names.length === 0) return '';
  const count = names.length === 1 ? '1 file' : `${names.length} files`;
  const named = names.slice(0, NAMED_FILES).join(', ');
  const more = names.length > NAMED_FILES ? ', …' : '';
  return `${count}: ${named}${more}`;
}

export function buildShareLinkPreview(note: {
  title: string | null;
  content: string | null;
  attachmentNames: string[];
}): ShareLinkPreview {
  const title = (note.title ?? '').replace(/\s+/g, ' ').trim();
  const body = noteContentToPlainText(note.content);
  const files = describeFiles(note.attachmentNames);

  if (title) {
    return {
      title: truncatePreviewText(title),
      description: truncatePreviewText(body) || files || FALLBACK_DESCRIPTION,
    };
  }
  if (body) {
    return {
      title: truncatePreviewText(body),
      description: files || FALLBACK_DESCRIPTION,
    };
  }
  if (files) {
    return {
      title: truncatePreviewText(files),
      description: FALLBACK_DESCRIPTION,
    };
  }
  return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The share page's HTML with the preview in it: its <title> and description
 * replaced, and Open Graph tags added for the apps that read only those.
 */
export function injectShareLinkPreview(
  html: string,
  preview: ShareLinkPreview,
): string {
  const title = escapeHtml(preview.title);
  const description = escapeHtml(preview.description);
  const tags = [
    `<meta property="og:type" content="article"/>`,
    `<meta property="og:site_name" content="${SITE_NAME}"/>`,
    `<meta property="og:title" content="${title}"/>`,
    `<meta property="og:description" content="${description}"/>`,
    `<meta name="twitter:card" content="summary"/>`,
  ].join('');

  let out = html.replace(
    /<title>[^<]*<\/title>/,
    () => `<title>${title}</title>`,
  );
  const describes = /<meta name="description" content="[^"]*"\s*\/?>/;
  out = describes.test(out)
    ? out.replace(
        describes,
        () => `<meta name="description" content="${description}"/>`,
      )
    : out.replace(
        '</head>',
        () => `<meta name="description" content="${description}"/></head>`,
      );
  return out.replace('</head>', () => `${tags}</head>`);
}
