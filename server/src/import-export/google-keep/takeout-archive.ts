import * as yauzl from 'yauzl';

/**
 * Read access to one Takeout export, which may come in several ZIP parts:
 * an entry is looked up by its path in whichever part holds it. Entries are
 * inflated one at a time from disk, so a large export never sits in memory.
 */
export class TakeoutArchive {
  private constructor(
    private readonly zips: yauzl.ZipFile[],
    private readonly entries: Map<
      string,
      { zip: yauzl.ZipFile; entry: yauzl.Entry }
    >,
  ) {}

  static async open(paths: string[]): Promise<TakeoutArchive> {
    const zips: yauzl.ZipFile[] = [];
    const entries = new Map<
      string,
      { zip: yauzl.ZipFile; entry: yauzl.Entry }
    >();
    try {
      for (const path of paths) {
        const zip = await openZip(path);
        zips.push(zip);
        for (const entry of await listEntries(zip)) {
          if (!entry.fileName.endsWith('/') && !entries.has(entry.fileName)) {
            entries.set(entry.fileName, { zip, entry });
          }
        }
      }
    } catch (error) {
      zips.forEach((zip) => zip.close());
      throw error;
    }
    return new TakeoutArchive(zips, entries);
  }

  get names(): string[] {
    return [...this.entries.keys()];
  }

  size(name: string): number {
    return this.entries.get(name)?.entry.uncompressedSize ?? 0;
  }

  /** The entry's bytes, refusing more than maxBytes. */
  async read(name: string, maxBytes: number): Promise<Buffer> {
    const found = this.entries.get(name);
    if (!found) throw new Error(`Not in the export: ${name}`);
    if (found.entry.uncompressedSize > maxBytes) {
      throw new Error(`Too large: ${name}`);
    }
    const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) =>
      found.zip.openReadStream(found.entry, (error, readStream) =>
        error || !readStream
          ? reject(error ?? new Error('No stream'))
          : resolve(readStream),
      ),
    );
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      total += chunk.length;
      if (total > maxBytes) throw new Error(`Too large: ${name}`);
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  close(): void {
    this.zips.forEach((zip) => zip.close());
  }
}

function openZip(path: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) =>
    yauzl.open(path, { lazyEntries: true, autoClose: false }, (error, zip) =>
      error || !zip
        ? reject(error ?? new Error('Not a ZIP file'))
        : resolve(zip),
    ),
  );
}

function listEntries(zip: yauzl.ZipFile): Promise<yauzl.Entry[]> {
  return new Promise((resolve, reject) => {
    const entries: yauzl.Entry[] = [];
    zip.on('entry', (entry: yauzl.Entry) => {
      entries.push(entry);
      zip.readEntry();
    });
    zip.once('end', () => resolve(entries));
    zip.once('error', reject);
    zip.readEntry();
  });
}
