import { describe, expect, it } from 'vitest';
import {
  buildShareLinkPreview,
  injectShareLinkPreview,
  noteContentToPlainText,
  truncatePreviewText,
} from './share-link-preview.util';

const delta = (...inserts: unknown[]) =>
  JSON.stringify({ ops: inserts.map((insert) => ({ insert })) });

describe('noteContentToPlainText', () => {
  it('drops formatting and embeds, keeping words apart', () => {
    expect(
      noteContentToPlainText(
        delta('Buy\n', { image: 'x' }, 'milk\n\n  and bread\n'),
      ),
    ).toBe('Buy milk and bread');
  });

  it('takes plain text as it is', () => {
    expect(noteContentToPlainText('just text')).toBe('just text');
    expect(noteContentToPlainText(null)).toBe('');
  });
});

describe('truncatePreviewText', () => {
  it('leaves short text alone', () => {
    expect(truncatePreviewText('short')).toBe('short');
  });

  it('cuts long text at a word, with an ellipsis', () => {
    const text = 'word '.repeat(30).trim();
    const cut = truncatePreviewText(text);
    expect(cut.endsWith('word…')).toBe(true);
    expect(Array.from(cut).length).toBeLessThanOrEqual(81);
  });

  it('cuts one long word where it must', () => {
    expect(truncatePreviewText('x'.repeat(100))).toBe(`${'x'.repeat(80)}…`);
  });
});

describe('buildShareLinkPreview', () => {
  it('shows the title and the start of the text', () => {
    expect(
      buildShareLinkPreview({
        title: ' Anki ',
        content: delta('Spaced repetition cards\n'),
        attachmentNames: ['deck.apkg'],
      }),
    ).toEqual({ title: 'Anki', description: 'Spaced repetition cards' });
  });

  it('shows the files under a title with no text', () => {
    expect(
      buildShareLinkPreview({
        title: 'Scans',
        content: delta('\n'),
        attachmentNames: ['a.pdf', 'b.jpg', 'c.png', 'd.png'],
      }),
    ).toEqual({
      title: 'Scans',
      description: '4 files: a.pdf, b.jpg, c.png, …',
    });
  });

  it('uses the start of the text when there is no title', () => {
    const preview = buildShareLinkPreview({
      title: '',
      content: delta(`${'lorem ipsum '.repeat(20)}\n`),
      attachmentNames: [],
    });
    expect(preview.title.startsWith('lorem ipsum')).toBe(true);
    expect(preview.title.endsWith('…')).toBe(true);
    expect(preview.description).toBe('A note shared from Anchor+');
  });

  it('names the files of a note with only files', () => {
    expect(
      buildShareLinkPreview({
        title: null,
        content: null,
        attachmentNames: ['receipt.pdf'],
      }),
    ).toEqual({
      title: '1 file: receipt.pdf',
      description: 'A note shared from Anchor+',
    });
  });

  it('falls back for an empty note', () => {
    expect(
      buildShareLinkPreview({
        title: null,
        content: null,
        attachmentNames: [],
      }),
    ).toEqual({
      title: 'Shared note',
      description: 'A note shared from Anchor+',
    });
  });
});

describe('injectShareLinkPreview', () => {
  const page =
    '<html><head><meta charSet="utf-8"/><title>Anchor+</title><meta name="description" content="Your thoughts, secured"/></head><body>x</body></html>';

  it('replaces the title and description and adds Open Graph tags', () => {
    const html = injectShareLinkPreview(page, {
      title: '"Tom" & <Jerry>',
      description: "It's $& fine",
    });
    expect(html).toContain(
      '<title>&quot;Tom&quot; &amp; &lt;Jerry&gt;</title>',
    );
    expect(html).toContain(
      '<meta name="description" content="It&#39;s $&amp; fine"/>',
    );
    expect(html).toContain(
      '<meta property="og:title" content="&quot;Tom&quot; &amp; &lt;Jerry&gt;"/>',
    );
    expect(html).toContain('<meta property="og:site_name" content="Anchor+"/>');
    expect(html).not.toContain('Your thoughts, secured');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.endsWith('</head><body>x</body></html>')).toBe(true);
  });
});
