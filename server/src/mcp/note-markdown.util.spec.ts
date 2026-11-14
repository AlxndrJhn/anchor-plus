import { describe, expect, it } from 'vitest';
import {
  appendMarkdownToContent,
  markdownCanCarry,
  noteContentToMarkdown,
} from './note-markdown.util';

const delta = (ops: unknown[]) => JSON.stringify({ ops });

describe('noteContentToMarkdown', () => {
  it('renders a Delta and passes plain text through', () => {
    expect(noteContentToMarkdown(delta([{ insert: 'hi\n' }]))).toBe('hi\n');
    expect(noteContentToMarkdown('plain')).toBe('plain');
    expect(noteContentToMarkdown(null)).toBe('');
  });
});

describe('appendMarkdownToContent', () => {
  it('adds lines after the existing ones', () => {
    expect(appendMarkdownToContent(delta([{ insert: 'a\n' }]), '**b**')).toBe(
      delta([
        { insert: 'a\n' },
        { insert: 'b', attributes: { bold: true } },
        { insert: '\n' },
      ]),
    );
  });

  it('fills a blank note without an empty first line', () => {
    expect(appendMarkdownToContent(delta([{ insert: '\n' }]), 'b')).toBe(
      delta([{ insert: 'b' }, { insert: '\n' }]),
    );
    expect(appendMarkdownToContent(null, 'b')).toBe(
      delta([{ insert: 'b' }, { insert: '\n' }]),
    );
  });

  it('keeps plain text content', () => {
    expect(appendMarkdownToContent('old', 'new')).toBe(
      delta([{ insert: 'old\n' }, { insert: 'new' }, { insert: '\n' }]),
    );
  });
});

describe('markdownCanCarry', () => {
  it('accepts what markdown writes and reads back', () => {
    expect(
      markdownCanCarry(
        delta([
          { insert: 'x', attributes: { bold: true, highlight: 'green' } },
          { insert: '\n', attributes: { list: 'checked', indent: 1 } },
        ]),
      ),
    ).toBe(true);
    expect(markdownCanCarry(null)).toBe(true);
  });

  it('refuses pictures, colours, fonts and custom highlights', () => {
    expect(markdownCanCarry(delta([{ insert: { image: 'a' } }]))).toBe(false);
    expect(
      markdownCanCarry(delta([{ insert: 'x', attributes: { color: '#f00' } }])),
    ).toBe(false);
    expect(
      markdownCanCarry(delta([{ insert: 'x', attributes: { font: 'serif' } }])),
    ).toBe(false);
    expect(
      markdownCanCarry(
        delta([{ insert: 'x', attributes: { highlight: '#123456' } }]),
      ),
    ).toBe(false);
  });

  it('refuses aligned lines, but not left ones', () => {
    expect(
      markdownCanCarry(
        delta([
          { insert: 'x' },
          { insert: '\n', attributes: { align: 'center' } },
        ]),
      ),
    ).toBe(false);
    expect(
      markdownCanCarry(
        delta([
          { insert: 'x' },
          { insert: '\n', attributes: { align: 'left' } },
        ]),
      ),
    ).toBe(true);
  });
});
