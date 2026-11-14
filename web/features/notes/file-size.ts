/** “820 KB”, “3.4 MB”. */
export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** What a card shows in place of its date while notes sort by size. */
export function storageSizeLabel(note: { storageSize?: number }) {
  return fileSize(note.storageSize ?? 0);
}
