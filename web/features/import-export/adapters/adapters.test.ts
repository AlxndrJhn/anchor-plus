import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { anchorAdapter } from "./anchor";
import { anchorManifestFixture } from "./fixtures/anchor-manifest";
import {
  keepChecklistNote,
  keepLabeledNote,
  keepNoteWithMedia,
  keepTextNote,
  keepTrashedNote,
} from "./fixtures/keep-notes";
import {
  anchorExportArchived,
  anchorExportGroceries,
  appleIdeas,
  appleMeeting,
  blankFile,
  nextcloudPacking,
  nextcloudPancakes,
  obsidianAnchor,
  obsidianDaily,
  readmeFile,
} from "./fixtures/markdown-notes";
import { googleKeepAdapter } from "./google-keep";
import { detectFormat } from "./index";
import { markdownAdapter } from "./markdown";
import { openZip, readFiles, type ZipArchive } from "./zip";

const readZip = (bytes: Uint8Array) =>
  openZip(new Blob([bytes as Uint8Array<ArrayBuffer>]));

function anchorZipBytes(): Uint8Array {
  return zipSync({
    "manifest.json": strToU8(JSON.stringify(anchorManifestFixture)),
    "attachments/11111111-1111-4111-8111-111111111111/att-1.png":
      new Uint8Array([1, 2, 3, 4]),
  });
}

function buildAnchorZip(): Promise<ZipArchive> {
  return readZip(anchorZipBytes());
}

function buildKeepZip(prefix = "Takeout/Keep/"): Promise<ZipArchive> {
  return readZip(
    zipSync({
      [`${prefix}shopping.json`]: strToU8(JSON.stringify(keepTextNote)),
      [`${prefix}packing.json`]: strToU8(JSON.stringify(keepChecklistNote)),
      [`${prefix}ideas.json`]: strToU8(JSON.stringify(keepLabeledNote)),
      [`${prefix}junk.json`]: strToU8(JSON.stringify(keepTrashedNote)),
      [`${prefix}receipt-note.json`]: strToU8(
        JSON.stringify(keepNoteWithMedia),
      ),
      [`${prefix}shopping.html`]: strToU8("<html></html>"),
      [`${prefix}receipt.jpg`]: new Uint8Array([255, 216, 255]),
      [`${prefix}voice-memo.3gp`]: new Uint8Array([0, 0, 0]),
    }),
  );
}

const picked = (files: File[]) =>
  files.map((file) => ({ path: file.name, file }));

function markdownZip(
  entries: Record<string, string | Uint8Array>,
): Promise<ZipArchive> {
  return readZip(
    zipSync(
      Object.fromEntries(
        Object.entries(entries).map(([name, value]) => [
          name,
          typeof value === "string" ? strToU8(value) : value,
        ]),
      ),
    ),
  );
}

const nextcloudZip = () =>
  markdownZip({
    "Notes/Recipes/Pancakes.md": nextcloudPancakes,
    "Notes/Travel/Packing.md": nextcloudPacking,
  });

const appleZip = () =>
  markdownZip({
    "Meeting- Q3 planning.md": appleMeeting,
    "Ideas.md": appleIdeas,
  });

const obsidianZip = () =>
  markdownZip({
    "Vault/Projects/Anchor.md": obsidianAnchor,
    "Vault/Daily/2026-01-01.md": obsidianDaily,
    "Vault/attachments/diagram.png": new Uint8Array([1, 2, 3]),
    "Vault/assets/shot.png": new Uint8Array([4, 5]),
    "Vault/Projects/spec.pdf": new Uint8Array([6]),
    "Vault/.obsidian/app.json": "{}",
    "Vault/.obsidian/notes.md": "hidden",
  });

const anchorMarkdownZip = () =>
  markdownZip({
    "Groceries.md": anchorExportGroceries,
    "Archived/Old plan.md": anchorExportArchived,
    "attachments/Groceries/receipt.png": new Uint8Array([7, 8]),
  });

describe("format detection", () => {
  it("detects anchor backups by manifest", async () => {
    expect(await anchorAdapter.detect(await buildAnchorZip())).toBe(true);
    expect(await googleKeepAdapter.detect(await buildAnchorZip())).toBe(false);
  });

  it("detects keep takeouts by folder path", async () => {
    expect(await googleKeepAdapter.detect(await buildKeepZip())).toBe(true);
    expect(await anchorAdapter.detect(await buildKeepZip())).toBe(false);
  });

  it("detects keep takeouts with localized folder names via content sniffing", async () => {
    const zip = await buildKeepZip("Takeout/Notizen/");
    expect(await googleKeepAdapter.detect(zip)).toBe(true);
  });

  it("reads each keep note once across detect and parse", async () => {
    const zip = await buildKeepZip("Takeout/Notizen/");
    const reads = new Map<string, number>();
    const counting: ZipArchive = {
      ...zip,
      text: (path) => {
        reads.set(path, (reads.get(path) ?? 0) + 1);
        return zip.text(path);
      },
    };

    await googleKeepAdapter.detect(counting);
    await googleKeepAdapter.parse(counting);

    expect(reads.size).toBe(5);
    expect([...reads.values()].every((count) => count === 1)).toBe(true);
  });

  it("detects markdown files, and only after the specific formats", async () => {
    expect(await markdownAdapter.detect(await nextcloudZip())).toBe(true);
    expect(
      await markdownAdapter.detect(
        await markdownZip({ "notes/A.MARKDOWN": "hi" }),
      ),
    ).toBe(true);
    expect(await markdownAdapter.detect(await buildAnchorZip())).toBe(false);
    expect(await markdownAdapter.detect(await buildKeepZip())).toBe(false);
  });

  it("ignores hidden folders and macOS resource forks", async () => {
    const zip = await markdownZip({
      "__MACOSX/._note.md": "junk",
      ".trash/gone.md": "junk",
    });
    expect(await markdownAdapter.detect(zip)).toBe(false);
  });
});

/** A one-entry ZIP64 archive, as Takeout writes for exports over 4 GB. */
function zip64Bytes(name: string, data: Uint8Array): Uint8Array {
  const nameBytes = strToU8(name);
  const local = new Uint8Array(30 + nameBytes.length + data.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(26, nameBytes.length, true);
  local.set(nameBytes, 30);
  local.set(data, 30 + nameBytes.length);

  const central = new Uint8Array(46 + nameBytes.length + 28);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint32(20, 0xffffffff, true);
  cv.setUint32(24, 0xffffffff, true);
  cv.setUint16(28, nameBytes.length, true);
  cv.setUint16(30, 28, true);
  cv.setUint32(42, 0xffffffff, true);
  central.set(nameBytes, 46);
  const extra = 46 + nameBytes.length;
  cv.setUint16(extra, 0x0001, true);
  cv.setUint16(extra + 2, 24, true);
  cv.setBigUint64(extra + 4, BigInt(data.length), true);
  cv.setBigUint64(extra + 12, BigInt(data.length), true);
  cv.setBigUint64(extra + 20, BigInt(0), true);

  const end = new Uint8Array(56 + 20 + 22);
  const ev = new DataView(end.buffer);
  const dirOffset = local.length;
  ev.setUint32(0, 0x06064b50, true);
  ev.setBigUint64(32, BigInt(1), true);
  ev.setBigUint64(40, BigInt(central.length), true);
  ev.setBigUint64(48, BigInt(dirOffset), true);
  ev.setUint32(56, 0x07064b50, true);
  ev.setBigUint64(64, BigInt(dirOffset + central.length), true);
  ev.setUint32(76, 0x06054b50, true);
  ev.setUint16(86, 0xffff, true);
  ev.setUint32(88, 0xffffffff, true);
  ev.setUint32(92, 0xffffffff, true);

  const out = new Uint8Array(local.length + central.length + end.length);
  out.set(local, 0);
  out.set(central, local.length);
  out.set(end, local.length + central.length);
  return out;
}

describe("openZip", () => {
  it("reads text entries and attachments from the same archive", async () => {
    const zip = await markdownZip({
      "Notes/A.md": "first",
      "Notes/B.MARKDOWN": "second",
      "Notes/data.json": "{}",
      "Notes/readme.txt": "plain",
      "Notes/shot.png": new Uint8Array([1, 2, 3]),
    });

    expect(zip.text("Notes/A.md")).toBe("first");
    expect(zip.text("Notes/B.MARKDOWN")).toBe("second");
    expect(zip.text("Notes/data.json")).toBe("{}");
    expect(
      new Uint8Array(await (await zip.blob("Notes/readme.txt")).arrayBuffer()),
    ).toEqual(strToU8("plain"));
    expect(
      new Uint8Array(await (await zip.blob("Notes/shot.png")).arrayBuffer()),
    ).toEqual(new Uint8Array([1, 2, 3]));
    expect(zip.text("Notes/readme.txt")).toBe("plain");
    expect(() => zip.text("Notes/missing.md")).toThrow();
  });

  it("knows when each entry was last changed", async () => {
    const changed = new Date("2024-03-05T14:22:10Z");
    // Extended timestamp field: flags (mtime set), then UTC seconds
    const utc = new Uint8Array(5);
    utc[0] = 1;
    new DataView(utc.buffer).setUint32(1, Date.UTC(2023, 6, 1) / 1000, true);

    const zip = await readZip(
      zipSync({
        "Notes/dos.md": [strToU8("a"), { mtime: changed }],
        "Notes/utc.md": [
          strToU8("b"),
          { mtime: changed, extra: { 21589: utc } },
        ],
        "Notes/zero.md": [strToU8("c"), { mtime: new Date(1980, 0, 1) }],
      }),
    );

    expect(zip.modifiedAt?.("Notes/dos.md")).toBe(changed.toISOString());
    expect(zip.modifiedAt?.("Notes/utc.md")).toBe("2023-07-01T00:00:00.000Z");
    // The format's zero date means "unknown", not 1980
    expect(zip.modifiedAt?.("Notes/zero.md")).toBeUndefined();
    expect(zip.modifiedAt?.("Notes/missing.md")).toBeUndefined();
  });

  it("opens a large export without reading it whole", async () => {
    const photo = new Uint8Array(4 * 1024 * 1024).map((_, i) => i * 7);
    const bytes = zipSync(
      {
        "Takeout/Keep/a.json": strToU8(JSON.stringify(keepTextNote)),
        "Takeout/Keep/photo.jpg": [photo, { level: 0 }],
      },
      { level: 6 },
    );
    const file = new Blob([bytes as Uint8Array<ArrayBuffer>]);
    let largestRead = 0;
    const slice = file.slice.bind(file);
    file.slice = (start?: number, end?: number) => {
      largestRead = Math.max(largestRead, (end ?? file.size) - (start ?? 0));
      return slice(start, end);
    };

    const zip = await openZip(file);
    expect(largestRead).toBeLessThan(100 * 1024);
    expect(JSON.parse(zip.text("Takeout/Keep/a.json")).title).toBe(
      keepTextNote.title,
    );
    const blob = await zip.blob("Takeout/Keep/photo.jpg");
    // toEqual walks 4 MB element by element; compare the bytes at once.
    expect(
      Buffer.from(await blob.arrayBuffer()).equals(Buffer.from(photo)),
    ).toBe(true);
  });

  it("reads ZIP64 archives", async () => {
    const zip = await readZip(zip64Bytes("Takeout/Keep/n.json", strToU8("{}")));
    expect(zip.names).toEqual(["Takeout/Keep/n.json"]);
    expect(zip.text("Takeout/Keep/n.json")).toBe("{}");
  });

  it("refuses a file that is not a ZIP", async () => {
    await expect(readZip(strToU8("not a zip at all"))).rejects.toThrow(
      "This is not a ZIP file",
    );
  });
});

describe("readFiles", () => {
  it("reads text files and hands attachments back as the picked file", async () => {
    const image = new File([new Uint8Array([1, 2])], "shot.png", {
      type: "image/png",
    });
    const zip = await readFiles([
      { path: "Vault/Note.md", file: new File(["body"], "Note.md") },
      { path: "Vault/shot.png", file: image },
    ]);

    expect(zip.names).toEqual(["Vault/Note.md", "Vault/shot.png"]);
    expect(zip.text("Vault/Note.md")).toBe("body");
    expect(await zip.blob("Vault/shot.png")).toBe(image);
  });

  it("takes each file's date from the file itself", async () => {
    const lastModified = Date.UTC(2022, 1, 3, 4, 5, 6);
    const zip = await readFiles([
      {
        path: "Notes/Old.txt",
        file: new File(["old"], "Old.txt", { lastModified }),
      },
    ]);

    expect(zip.text("Notes/Old.txt")).toBe("old");
    expect(zip.modifiedAt?.("Notes/Old.txt")).toBe(
      new Date(lastModified).toISOString(),
    );
  });
});

describe("anchorAdapter.parse", () => {
  it("maps manifest notes to canonical notes", async () => {
    const parsed = await anchorAdapter.parse(await buildAnchorZip());

    expect(parsed.formatId).toBe("anchor");
    expect(parsed.notes).toHaveLength(3);
    // Every manifest tag survives with its color, even ones no note references.
    expect(
      [...parsed.tags].sort((a, b) => a.name.localeCompare(b.name)),
    ).toEqual([
      { name: "Empty tag", color: "#00ff00" },
      { name: "Personal", color: null },
      { name: "Work", color: "#ff0000" },
    ]);
    expect(parsed.attachmentCount).toBe(1);
    expect(parsed.skipped).toEqual([]);

    const owned = parsed.notes[0];
    expect(owned.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(owned.isPinned).toBe(true);
    expect(owned.background).toBe("color_teal");
    expect(owned.tagNames).toEqual(["Work", "Personal"]);
    expect(owned.contentDelta).toEqual({ ops: [{ insert: "hello\n" }] });
    expect(owned.attachments[0].supported).toBe(true);
    expect((await owned.attachments[0].getBlob()).size).toBe(4);

    const trashed = parsed.notes[1];
    expect(trashed.isTrashed).toBe(true);

    const shared = parsed.notes[2];
    expect(shared.id).toBeUndefined();
    expect(shared.title).toBe("Shared with me");
  });

  it("rejects manifests from newer format versions", async () => {
    const zip = await readZip(
      zipSync({
        "manifest.json": strToU8(
          JSON.stringify({ ...anchorManifestFixture, version: 2 }),
        ),
      }),
    );
    await expect(anchorAdapter.parse(zip)).rejects.toThrow(/newer version/);
  });

  it("rejects manifests with a missing version field", async () => {
    const { version: _dropped, ...versionless } = anchorManifestFixture;
    const zip = await readZip(
      zipSync({ "manifest.json": strToU8(JSON.stringify(versionless)) }),
    );
    await expect(anchorAdapter.parse(zip)).rejects.toThrow(/newer version/);
  });
});

describe("googleKeepAdapter.parse", () => {
  it("imports active and archived notes, skipping trashed ones", async () => {
    const parsed = await googleKeepAdapter.parse(await buildKeepZip());

    expect(parsed.formatId).toBe("google-keep");
    expect(parsed.notes.map((note) => note.title).sort()).toEqual([
      "Packing list",
      "Project ideas",
      "Receipt",
      "Shopping thoughts",
    ]);
    expect(parsed.skipped).toContainEqual({
      item: "Old junk",
      reason: "Trashed in Google Keep",
    });
  });

  it("maps keep fields to canonical notes", async () => {
    const parsed = await googleKeepAdapter.parse(await buildKeepZip());
    const byTitle = new Map(parsed.notes.map((note) => [note.title, note]));

    const shopping = byTitle.get("Shopping thoughts");
    expect(shopping?.isPinned).toBe(true);
    expect(shopping?.background).toBe("color_teal");
    expect(shopping?.createdAt).toBe(new Date(1700000000000).toISOString());
    expect(shopping?.updatedAt).toBe(new Date(1700000400123).toISOString());
    expect(shopping?.contentDelta.ops[0]).toEqual({
      insert: "Buy milk\nAnd maybe bread\n",
    });

    const packing = byTitle.get("Packing list");
    expect(packing?.isArchived).toBe(true);
    expect(packing?.contentDelta.ops).toContainEqual({
      insert: "\n",
      attributes: { list: "checked" },
    });

    const ideas = byTitle.get("Project ideas");
    expect(ideas?.tagNames).toEqual(["Projects", "Weekend"]);
    expect(parsed.tags).toContainEqual({ name: "Projects", color: null });
    expect(ideas?.background).toBe("color_dark_blue");
    expect(ideas?.contentDelta.ops).toContainEqual({
      insert: "https://example.com/plans",
      attributes: { link: "https://example.com/plans" },
    });
  });

  it("resolves media by stem and flags unsupported types", async () => {
    const parsed = await googleKeepAdapter.parse(await buildKeepZip());
    const receipt = parsed.notes.find((note) => note.title === "Receipt");

    expect(receipt?.attachments).toHaveLength(2);
    const [image, audio] = receipt?.attachments ?? [];
    expect(image.filename).toBe("receipt.jpg");
    expect(image.supported).toBe(true);
    expect(audio.supported).toBe(false);
    expect(parsed.skipped).toContainEqual({
      item: "voice-memo.3gp",
      reason: "Unsupported file type (audio/3gpp)",
    });
    // Only supported attachments count toward the preview total
    expect(parsed.attachmentCount).toBe(1);
  });
});

describe("markdownAdapter.parse", () => {
  it("takes the title from the filename and folders from the path", async () => {
    const parsed = await markdownAdapter.parse(await nextcloudZip());

    expect(parsed.formatId).toBe("markdown");
    expect(parsed.hasFolders).toBe(true);
    expect(parsed.notes.map((note) => note.title)).toEqual([
      "Pancakes",
      "Packing",
    ]);
    expect(parsed.notes[0].folderTags).toEqual(["Recipes"]);
    expect(parsed.notes[1].folderTags).toEqual(["Travel"]);
    expect(parsed.tags).toEqual([
      { name: "Recipes", color: null },
      { name: "Travel", color: null },
    ]);
    expect(parsed.notes[0].tagNames).toEqual([]);
    expect(parsed.notes[0].contentDelta.ops).toContainEqual({
      insert: "\n",
      attributes: { list: "unchecked", indent: 1 },
    });
  });

  it("reads a Nextcloud Notes folder: .txt notes, hidden picture folders and dates", async () => {
    const changed = new Date("2025-09-14T08:30:00Z");
    const parsed = await markdownAdapter.parse(
      await readZip(
        zipSync({
          // Older Nextcloud Notes saved notes as .txt
          "Notes/Shopping.txt": [strToU8("milk\nbread\n"), { mtime: changed }],
          // Since Notes 6.1 pictures sit in .attachments.<note id>
          "Notes/Garden/Beds.md": strToU8(
            "Tomatoes left.\n\n![bed.png](.attachments.4711/bed%20one.png)\n",
          ),
          "Notes/Garden/.attachments.4711/bed one.png": new Uint8Array([
            1, 2, 3,
          ]),
          // Notes 6.0 and older kept them flat beside the note
          "Notes/Garden/Shed.md": strToU8(
            "![](d8aef2005b4f815fec8ade5388240f2c.png)\n\nTools.\n",
          ),
          "Notes/Garden/d8aef2005b4f815fec8ade5388240f2c.png": new Uint8Array([
            4, 5,
          ]),
        }),
      ),
    );
    const byTitle = new Map(parsed.notes.map((note) => [note.title, note]));

    expect([...byTitle.keys()].sort()).toEqual(["Beds", "Shed", "Shopping"]);
    expect(byTitle.get("Shopping")?.createdAt).toBe(changed.toISOString());
    expect(byTitle.get("Shopping")?.updatedAt).toBe(changed.toISOString());
    expect(byTitle.get("Shopping")?.folderTags).toEqual([]);

    const beds = byTitle.get("Beds");
    expect(beds?.folderTags).toEqual(["Garden"]);
    expect(beds?.attachments.map((a) => a.filename)).toEqual(["bed one.png"]);
    expect(await beds?.attachments[0].getBlob().then((b) => b.size)).toBe(3);
    expect(byTitle.get("Shed")?.attachments.map((a) => a.filename)).toEqual([
      "d8aef2005b4f815fec8ade5388240f2c.png",
    ]);
    expect(parsed.attachmentCount).toBe(2);
    expect(parsed.skipped).toEqual([]);
  });

  it("drops a title heading that repeats the filename", async () => {
    const parsed = await markdownAdapter.parse(await appleZip());
    const byTitle = new Map(parsed.notes.map((note) => [note.title, note]));

    expect(byTitle.get("Meeting- Q3 planning")?.contentDelta.ops[0]).toEqual({
      insert: "Agenda",
    });
    // A heading that says something else is content
    expect(byTitle.get("Ideas")?.contentDelta.ops).toEqual([
      { insert: "Rough thoughts" },
      { insert: "\n", attributes: { header: 1 } },
      { insert: "\n" },
      { insert: "Body text" },
      { insert: "\n" },
    ]);
    expect(parsed.hasFolders).toBe(false);
  });

  it("resolves obsidian embeds and relative images, skipping other files", async () => {
    const parsed = await markdownAdapter.parse(await obsidianZip());
    const anchor = parsed.notes.find((note) => note.title === "Anchor");

    expect(parsed.notes.map((note) => note.title).sort()).toEqual([
      "2026-01-01",
      "Anchor",
    ]);
    expect(anchor?.attachments.map((a) => a.filename)).toEqual([
      "diagram.png",
      "shot.png",
    ]);
    expect(await anchor?.attachments[0].getBlob().then((b) => b.size)).toBe(3);
    expect(parsed.attachmentCount).toBe(2);

    const text = anchor?.contentDelta.ops
      .map((op) => (typeof op.insert === "string" ? op.insert : ""))
      .join("");
    expect(text).toContain("See my ideas and spec");
    expect(text).not.toContain("diagram.png");
    expect(anchor?.folderTags).toEqual(["Projects"]);
  });

  it("keeps readme-style structure without inventing formats", async () => {
    const parsed = await markdownAdapter.parse(
      await markdownZip({ "README.md": readmeFile }),
    );
    const ops = parsed.notes[0].contentDelta.ops;

    expect(ops[1]).toEqual({ insert: "\n", attributes: { header: 1 } });
    expect(ops).toContainEqual({
      insert: "\n",
      attributes: { "code-block": true },
    });
    expect(ops).toContainEqual({ insert: "| a | b |" });
    expect(ops).toContainEqual({
      insert: "https://example.com",
      attributes: { link: "https://example.com" },
    });
    expect(
      ops.some(
        (op) => typeof op.insert === "string" && op.insert.includes("&"),
      ),
    ).toBe(true);
    expect(parsed.notes[0].folderTags).toEqual([]);
  });

  it("round-trips its own markdown export", async () => {
    const parsed = await markdownAdapter.parse(await anchorMarkdownZip());
    const groceries = parsed.notes.find((note) => note.title === "Groceries");
    const archived = parsed.notes.find((note) => note.title === "Old plan");

    expect(groceries?.contentDelta.ops).toEqual([
      { insert: "milk" },
      { insert: "\n" },
    ]);
    expect(groceries?.attachments.map((a) => a.filename)).toEqual([
      "receipt.png",
    ]);
    expect(archived?.isArchived).toBe(true);
    expect(archived?.folderTags).toEqual([]);
    expect(parsed.hasFolders).toBe(false);
  });

  it("finds a shared attachments folder kept above the notes", async () => {
    // How Apple Notes exporters lay out a multi-folder export
    const parsed = await markdownAdapter.parse(
      await markdownZip({
        "Export/Personal/Trip.md": "![](Attachments/A1B2.jpeg)\n\nbody\n",
        "Export/Work/Plan.md": "See ![](Attachments/C3D4.jpeg)\n",
        "Export/Attachments/A1B2.jpeg": new Uint8Array([1]),
        "Export/Attachments/C3D4.jpeg": new Uint8Array([2, 3]),
      }),
    );

    expect(parsed.skipped).toEqual([]);
    expect(
      parsed.notes.map((note) => note.attachments.map((a) => a.filename)),
    ).toEqual([["A1B2.jpeg"], ["C3D4.jpeg"]]);
    expect(parsed.attachmentCount).toBe(2);
  });

  it("skips blank files and reports unresolved references", async () => {
    const parsed = await markdownAdapter.parse(
      await markdownZip({
        "Blank.md": blankFile,
        "Real.md": "![missing](gone.png)\n\ntext\n",
        "Notes.json": "{}",
      }),
    );

    expect(parsed.notes.map((note) => note.title)).toEqual(["Real"]);
    expect(parsed.skipped).toContainEqual({
      item: "Blank",
      reason: "Empty file",
    });
    expect(parsed.skipped).toContainEqual({
      item: "gone.png",
      reason: "Attachment file not found",
    });
  });

  it("treats an Untitled filename as no title", async () => {
    const parsed = await markdownAdapter.parse(
      await markdownZip({ "Untitled.md": "body\n" }),
    );
    expect(parsed.notes[0].title).toBe("");
  });
});

describe("detectFormat", () => {
  it("returns the matching adapter for a zip file", async () => {
    const file = new File([anchorZipBytes() as BlobPart], "backup.zip", {
      type: "application/zip",
    });
    const result = await detectFormat([{ path: file.name, file }]);
    expect(result?.adapter.id).toBe("anchor");
  });

  it("reads loose markdown files without a zip around them", async () => {
    const files = picked([
      new File(["# a\n"], "First.md", { type: "text/markdown" }),
      new File(["b\n"], "Second.md", { type: "text/markdown" }),
    ]);
    const result = await detectFormat(files);
    expect(result?.adapter.id).toBe("markdown");

    const parsed = await result?.adapter.parse(result.zip);
    expect(parsed?.notes.map((note) => note.title)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("pairs a loose markdown file with the image it references", async () => {
    const files = picked([
      new File(["![shot](shot.png)\n\nbody\n"], "Note.md"),
      new File([new Uint8Array([1, 2])], "shot.png", { type: "image/png" }),
    ]);
    const result = await detectFormat(files);
    const parsed = await result?.adapter.parse(result.zip);

    expect(parsed?.notes[0].attachments.map((a) => a.filename)).toEqual([
      "shot.png",
    ]);
  });

  it("keeps the folder structure of a picked directory", async () => {
    const result = await detectFormat([
      {
        path: "Vault/Recipes/Pancakes.md",
        file: new File(["flour\n"], "Pancakes.md"),
      },
      {
        path: "Vault/Travel/Packing.md",
        file: new File(["passport\n"], "Packing.md"),
      },
    ]);
    const parsed = await result?.adapter.parse(result.zip);

    expect(result?.adapter.id).toBe("markdown");
    expect(parsed?.notes.map((note) => note.folderTags)).toEqual([
      ["Recipes"],
      ["Travel"],
    ]);
  });

  it("returns null for a non-zip file and for an empty pick", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "junk.bin");
    expect(await detectFormat(picked([file]))).toBeNull();
    expect(await detectFormat([])).toBeNull();
  });

  it("fails on a zip it can't read instead of finding nothing", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "broken.zip", {
      type: "application/zip",
    });
    await expect(detectFormat(picked([file]))).rejects.toThrow();
  });
});
