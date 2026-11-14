import { describe, expect, it } from 'vitest';
import { AttachmentType } from 'src/generated/prisma/enums';
import { transformNote } from './note-transformer.util';

const note = {
  id: 'n1',
  title: 'Café',
  content: 'hello',
  version: 1,
  background: null,
  state: 'active',
  isFrozen: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  userId: 'u1',
  archives: [],
};

describe('transformNote', () => {
  it('adds up the text and every attachment into the storage size', () => {
    const transformed = transformNote(
      {
        ...note,
        attachments: [
          { id: 'a1', type: AttachmentType.image, fileSize: 1000, text: 'x' },
          { id: 'a2', type: AttachmentType.audio, fileSize: 500 },
        ],
        files: [{ fileSize: 2000 }],
      },
      'u1',
    );

    // "Café" is 5 bytes in UTF-8, "hello" 5.
    expect(transformed.storageSize).toBe(10 + 1000 + 500 + 2000);
    expect(transformed.imagePreviewIds).toEqual(['a1']);
    expect(transformed.pictureText).toBe('x');
  });

  it('leaves the storage size out when attachments were not loaded', () => {
    expect(transformNote(note, 'u1').storageSize).toBeUndefined();
  });
});
