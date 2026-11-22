import { describe, expect, it } from 'vitest';
import {
  AttachmentInputError,
  decodeAttachments,
  mimeTypeForFilename,
} from './attachment-input.util';
import { ATTACHMENT_MAX_FILE_SIZE } from '../notes/constants/notes.constants';

const b64 = (text: string) => Buffer.from(text).toString('base64');

describe('decodeAttachments', () => {
  it('decodes base64 and reads the type from the name', () => {
    const [file] = decodeAttachments([
      { filename: 'notes.txt', data: b64('hello') },
    ]);
    expect(file).toEqual({
      originalname: 'notes.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('hello'),
      size: 5,
    });
  });

  it('takes the type given, then the one in a data: URL', () => {
    const [given, fromUrl] = decodeAttachments([
      { filename: 'a', data: b64('x'), mimeType: 'Image/PNG' },
      { filename: 'b', data: `data:audio/ogg;base64,${b64('y')}` },
    ]);
    expect(given.mimetype).toBe('image/png');
    expect(fromUrl.mimetype).toBe('audio/ogg');
    expect(fromUrl.buffer.toString()).toBe('y');
  });

  it('keeps only the last part of a path as the name', () => {
    const [file] = decodeAttachments([
      { filename: '..\\..\\etc/passwd.bin', data: b64('x') },
    ]);
    expect(file.originalname).toBe('passwd.bin');
    expect(file.mimetype).toBe('application/octet-stream');
  });

  it('refuses what is not base64, or is empty', () => {
    expect(() =>
      decodeAttachments([{ filename: 'a.png', data: 'nope!' }]),
    ).toThrow(AttachmentInputError);
    expect(() => decodeAttachments([{ filename: 'a.png', data: '' }])).toThrow(
      AttachmentInputError,
    );
    expect(() =>
      decodeAttachments([{ filename: ' ', data: b64('x') }]),
    ).toThrow('no filename');
  });

  it('takes a file as big as an attachment can be', () => {
    const [file] = decodeAttachments([
      {
        filename: 'a.bin',
        data: Buffer.alloc(ATTACHMENT_MAX_FILE_SIZE).toString('base64'),
      },
    ]);
    expect(file.size).toBe(ATTACHMENT_MAX_FILE_SIZE);
  });

  it('refuses attachments too big to send together', () => {
    const big = Buffer.alloc(30 * 1024 * 1024).toString('base64');
    expect(() =>
      decodeAttachments([
        { filename: 'a.bin', data: big },
        { filename: 'b.bin', data: big },
      ]),
    ).toThrow('too big to send in one call');
  });
});

describe('mimeTypeForFilename', () => {
  it('knows pictures, recordings and documents', () => {
    expect(mimeTypeForFilename('A.JPG')).toBe('image/jpeg');
    expect(mimeTypeForFilename('a.m4a')).toBe('audio/mp4');
    expect(mimeTypeForFilename('a.pdf')).toBe('application/pdf');
  });
});
