import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { splitFrontMatter } from "./front-matter";
import { detectFormat } from "./index";
import { joplinAdapter, parseJoplinItem } from "./joplin";
import { markdownAdapter, notionAdapter } from "./markdown";
import { simplenoteAdapter } from "./simplenote";
import { lexicalToDelta, standardNotesAdapter } from "./standard-notes";
import { openTar } from "./tar";
import { openZip, type ZipArchive } from "./zip";

const encoder = new TextEncoder();

const zipOf = (files: Record<string, string | Uint8Array>) =>
  zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, data]) => [
        path,
        typeof data === "string" ? strToU8(data) : data,
      ]),
    ),
  );

const readZip = (files: Record<string, string | Uint8Array>) =>
  openZip(new Blob([zipOf(files) as Uint8Array<ArrayBuffer>]));

/** A minimal ustar archive, as Joplin writes its .jex exports. */
function tarOf(files: Record<string, string | Uint8Array>): Uint8Array {
  const blocks: Uint8Array[] = [];
  for (const [name, data] of Object.entries(files)) {
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    const header = new Uint8Array(512);
    const put = (text: string, at: number) =>
      header.set(encoder.encode(text), at);
    put(name, 0);
    put("0000644\0", 100);
    put("0000000\0", 108);
    put("0000000\0", 116);
    put(`${bytes.length.toString(8).padStart(11, "0")}\0`, 124);
    put("00000000000\0", 136);
    put("        ", 148);
    put("0", 156);
    put("ustar\0", 257);
    put("00", 263);
    let sum = 0;
    for (const byte of header) sum += byte;
    put(`${sum.toString(8).padStart(6, "0")}\0 `, 148);
    blocks.push(header);
    const body = new Uint8Array(Math.ceil(bytes.length / 512) * 512);
    body.set(bytes);
    blocks.push(body);
  }
  blocks.push(new Uint8Array(1024));
  const out = new Uint8Array(blocks.reduce((n, b) => n + b.length, 0));
  let at = 0;
  for (const block of blocks) {
    out.set(block, at);
    at += block.length;
  }
  return out;
}

const file = (name: string, data: Uint8Array | string) => ({
  path: name,
  file: new File([data as BlobPart], name),
});

describe("splitFrontMatter", () => {
  it("reads title, tags and dates, and leaves the body", () => {
    const { frontMatter, body } = splitFrontMatter(
      [
        "---",
        'title: "Trip plan"',
        "tags:",
        "  - travel",
        "  - '#summer'",
        "created: 2023-05-01T10:00:00Z",
        "modified: 2023-05-02",
        "pinned: true",
        "---",
        "",
        "Body",
      ].join("\n"),
    );
    expect(frontMatter).toEqual({
      title: "Trip plan",
      tags: ["travel", "summer"],
      createdAt: "2023-05-01T10:00:00.000Z",
      updatedAt: "2023-05-02T00:00:00.000Z",
      isPinned: true,
      isArchived: false,
    });
    expect(body).toBe("Body");
  });

  it("reads inline tag lists", () => {
    expect(
      splitFrontMatter("---\ntags: [a, b]\n---\nx").frontMatter?.tags,
    ).toEqual(["a", "b"]);
    expect(
      splitFrontMatter("---\ntags: a, b\n---\nx").frontMatter?.tags,
    ).toEqual(["a", "b"]);
    expect(
      splitFrontMatter("---\ntags: #a #b\n---\nx").frontMatter?.tags,
    ).toEqual(["a", "b"]);
  });

  it("leaves text without front matter alone", () => {
    expect(splitFrontMatter("---\n\nnot yaml\n---\nx")).toEqual({
      frontMatter: null,
      body: "---\n\nnot yaml\n---\nx",
    });
    expect(splitFrontMatter("plain").frontMatter).toBeNull();
  });
});

describe("markdownAdapter front matter and text files", () => {
  it("applies front matter tags and dates to the note", async () => {
    const parsed = await markdownAdapter.parse(
      await readZip({
        "vault/Trip.md":
          "---\ntags: [travel]\ncreated: 2023-05-01\n---\n# Trip\n\nGo\n",
      }),
    );
    const [note] = parsed.notes;
    expect(note.title).toBe("Trip");
    expect(note.tagNames).toEqual(["travel"]);
    expect(note.createdAt).toBe("2023-05-01T00:00:00.000Z");
    expect(note.contentDelta.ops).toEqual([{ insert: "Go" }, { insert: "\n" }]);
    expect(parsed.tags).toEqual([{ name: "travel", color: null }]);
  });

  it("prefers front matter dates over the file's own", async () => {
    const parsed = await markdownAdapter.parse({
      ...(await readZip({
        "Dated.md": "---\ncreated: 2020-01-01\n---\nx\n",
        "Undated.md": "y\n",
      })),
      modifiedAt: () => "2024-06-01T00:00:00.000Z",
    });
    expect(
      parsed.notes.map((note) => [note.createdAt, note.updatedAt]),
    ).toEqual([
      ["2020-01-01T00:00:00.000Z", "2024-06-01T00:00:00.000Z"],
      ["2024-06-01T00:00:00.000Z", "2024-06-01T00:00:00.000Z"],
    ]);
  });
});

const NOTION_ID = "0123456789abcdef0123456789abcdef";
const CHILD_ID = "fedcba9876543210fedcba9876543210";

describe("notionAdapter", () => {
  it("drops Notion's page ids from titles and folders", async () => {
    const zip = await readZip({
      [`Projects ${NOTION_ID}.md`]: "# Projects\n\nAll of them\n",
      [`Projects ${NOTION_ID}/Website ${CHILD_ID}.md`]: `# Website\n\n![shot](Website%20${CHILD_ID}/shot.png)\n`,
      [`Projects ${NOTION_ID}/Website ${CHILD_ID}/shot.png`]: new Uint8Array([
        137, 80,
      ]),
    });
    expect(await notionAdapter.detect(zip)).toBe(true);
    const parsed = await notionAdapter.parse(zip);
    expect(parsed.formatId).toBe("notion");
    expect(parsed.notes.map((note) => [note.title, note.folderTags])).toEqual([
      ["Projects", []],
      ["Website", ["Projects"]],
    ]);
    expect(parsed.notes[1].attachments.map((a) => a.filename)).toEqual([
      "shot.png",
    ]);
  });

  it("leaves ordinary Markdown to the Markdown importer", async () => {
    expect(await notionAdapter.detect(await readZip({ "a.md": "x" }))).toBe(
      false,
    );
  });

  it("reads exports split into zips inside the zip", async () => {
    const inner = zipOf({ [`Page ${NOTION_ID}.md`]: "Hello\n" });
    const outer = zipOf({ "Export-Part-1.zip": inner });
    const result = await detectFormat([file("Export.zip", outer)]);
    expect(result?.adapter.id).toBe("notion");
    const parsed = await result?.adapter.parse(result.zip);
    expect(parsed?.notes.map((note) => note.title)).toEqual(["Page"]);
  });
});

describe("simplenoteAdapter", () => {
  const exportJson = {
    activeNotes: [
      {
        id: "a",
        content: "Shopping\r\n\r\n- [ ] milk",
        creationDate: "2023-01-01T10:00:00.000Z",
        lastModified: "2023-01-02T10:00:00.000Z",
        tags: ["home"],
        pinned: true,
        markdown: true,
      },
      { id: "b", content: "Plain\n*not bold*" },
    ],
    trashedNotes: [{ id: "c", content: "Old note\nbody" }],
  };

  it("is detected from source/notes.json", async () => {
    const zip = await readZip({
      "source/notes.json": JSON.stringify(exportJson),
      "Shopping.txt": "Shopping",
    });
    expect(
      (
        await detectFormat([
          file(
            "notes.zip",
            zipOf({
              "source/notes.json": JSON.stringify(exportJson),
              "Shopping.txt": "Shopping",
            }),
          ),
        ])
      )?.adapter.id,
    ).toBe("simplenote");
    expect(await simplenoteAdapter.detect(zip)).toBe(true);
  });

  it("takes the first line as the title", async () => {
    const parsed = await simplenoteAdapter.parse(
      await readZip({ "source/notes.json": JSON.stringify(exportJson) }),
    );
    const [shopping, plain] = parsed.notes;
    expect(shopping).toMatchObject({
      title: "Shopping",
      isPinned: true,
      tagNames: ["home"],
      createdAt: "2023-01-01T10:00:00.000Z",
      updatedAt: "2023-01-02T10:00:00.000Z",
    });
    expect(shopping.contentDelta.ops).toEqual([
      { insert: "milk" },
      { insert: "\n", attributes: { list: "unchecked" } },
    ]);
    expect(plain.contentDelta.ops).toEqual([{ insert: "*not bold*\n" }]);
    expect(parsed.skipped).toEqual([
      { item: "Old note", reason: "In the trash in Simplenote" },
    ]);
  });
});

describe("standardNotesAdapter", () => {
  const superText = JSON.stringify({
    root: {
      children: [
        {
          type: "heading",
          tag: "h2",
          children: [{ type: "text", text: "Plan" }],
        },
        {
          type: "list",
          listType: "check",
          children: [
            {
              type: "listitem",
              checked: true,
              children: [{ type: "text", text: "Book", format: 1 }],
            },
            {
              type: "listitem",
              children: [
                {
                  type: "list",
                  listType: "bullet",
                  children: [
                    {
                      type: "listitem",
                      children: [{ type: "text", text: "inner" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          children: [
            {
              type: "link",
              url: "https://x.org",
              children: [{ type: "text", text: "x" }],
            },
          ],
        },
      ],
    },
  });

  const backup = {
    version: "004",
    items: [
      {
        uuid: "t1",
        content_type: "Tag",
        content: {
          title: "work",
          references: [{ uuid: "n1", content_type: "Note" }],
        },
      },
      {
        uuid: "n1",
        content_type: "Note",
        created_at: "2023-02-01T00:00:00.000Z",
        updated_at: "2023-02-02T00:00:00.000Z",
        content: {
          title: "Md",
          text: "**hi**",
          noteType: "markdown",
          pinned: true,
        },
      },
      {
        uuid: "n2",
        content_type: "Note",
        content: {
          title: "Super",
          text: superText,
          noteType: "super",
          archived: true,
        },
      },
      {
        uuid: "n3",
        content_type: "Note",
        content: { title: "Gone", text: "x", trashed: true },
      },
      { uuid: "n4", content_type: "Note", deleted: true, content: null },
      {
        uuid: "n5",
        content_type: "Note",
        content: { title: "Plain", text: "*as is*" },
      },
    ],
  };

  it("reads notes, tags, pins and archive", async () => {
    const result = await detectFormat([
      file("Standard Notes Backup and Import File.txt", JSON.stringify(backup)),
    ]);
    expect(result?.adapter.id).toBe("standard-notes");
    const parsed = await standardNotesAdapter.parse(result?.zip as ZipArchive);
    expect(parsed.notes.map((note) => note.title)).toEqual([
      "Md",
      "Super",
      "Plain",
    ]);
    const [md, superNote, plain] = parsed.notes;
    expect(md).toMatchObject({
      isPinned: true,
      tagNames: ["work"],
      createdAt: "2023-02-01T00:00:00.000Z",
    });
    expect(md.contentDelta.ops[0]).toEqual({
      insert: "hi",
      attributes: { bold: true },
    });
    expect(superNote.isArchived).toBe(true);
    expect(plain.contentDelta.ops).toEqual([{ insert: "*as is*\n" }]);
    expect(parsed.skipped).toEqual([
      { item: "Gone", reason: "In the trash in Standard Notes" },
    ]);
  });

  it("turns Super notes into formatted lines", () => {
    expect(lexicalToDelta(superText)?.ops).toEqual([
      { insert: "Plan" },
      { insert: "\n", attributes: { header: 2 } },
      { insert: "Book", attributes: { bold: true } },
      { insert: "\n", attributes: { list: "checked" } },
      { insert: "inner" },
      { insert: "\n", attributes: { list: "bullet", indent: 1 } },
      { insert: "x", attributes: { link: "https://x.org" } },
      { insert: "\n" },
    ]);
  });

  it("explains that encrypted backups can't be read", async () => {
    const encrypted = {
      version: "004",
      items: [{ uuid: "n1", content_type: "Note", content: "004:abc:def" }],
    };
    const result = await detectFormat([
      file("backup.txt", JSON.stringify(encrypted)),
    ]);
    await expect(result?.adapter.parse(result.zip)).rejects.toThrow(
      /decrypted backup/,
    );
  });
});

const id = (n: number) => n.toString(16).padStart(32, "0");

describe("joplin", () => {
  const folderParent = `Work\n\nid: ${id(1)}\nparent_id: \ntype_: 2`;
  const folderChild = `Projects\n\nid: ${id(2)}\nparent_id: ${id(1)}\ntype_: 2`;
  const note = [
    "Launch",
    "",
    "Steps:",
    "",
    `![diagram](:/${id(5)})`,
    `See [other](:/${id(9)})`,
    "",
    `id: ${id(3)}`,
    `parent_id: ${id(2)}`,
    "created_time: 2023-03-01T10:00:00.000Z",
    "updated_time: 2023-03-02T10:00:00.000Z",
    "user_created_time: 2023-03-01T09:00:00.000Z",
    "user_updated_time: 2023-03-02T09:00:00.000Z",
    "markup_language: 1",
    "deleted_time: 0",
    "type_: 1",
  ].join("\n");
  const trashed = `Old\n\nbody\n\nid: ${id(4)}\nparent_id: ${id(1)}\ndeleted_time: 1700000000000\ntype_: 1`;
  const resource = `diagram.png\n\nid: ${id(5)}\nmime: image/png\nfile_extension: png\ntype_: 4`;
  const tag = `urgent\n\nid: ${id(6)}\ntype_: 5`;
  const noteTag = `id: ${id(7)}\nnote_id: ${id(3)}\ntag_id: ${id(6)}\ntype_: 6`;

  it("reads an item's title, body and properties", () => {
    expect(parseJoplinItem(note)).toMatchObject({
      title: "Launch",
      body: `Steps:\n\n![diagram](:/${id(5)})\nSee [other](:/${id(9)})`,
      type: 1,
    });
    expect(parseJoplinItem("just text")).toBeNull();
  });

  it("reads a .jex export with notebooks, tags and resources", async () => {
    const jex = tarOf({
      [`${id(1)}.md`]: folderParent,
      [`${id(2)}.md`]: folderChild,
      [`${id(3)}.md`]: note,
      [`${id(4)}.md`]: trashed,
      [`${id(5)}.md`]: resource,
      [`${id(6)}.md`]: tag,
      [`${id(7)}.md`]: noteTag,
      [`resources/${id(5)}.png`]: new Uint8Array([137, 80, 78, 71]),
    });
    const result = await detectFormat([file("export.jex", jex)]);
    expect(result?.adapter.id).toBe("joplin");

    const parsed = await joplinAdapter.parse(result?.zip as ZipArchive);
    expect(parsed.notes).toHaveLength(1);
    const [launch] = parsed.notes;
    expect(launch).toMatchObject({
      title: "Launch",
      tagNames: ["urgent"],
      folderTags: ["Work", "Projects"],
      createdAt: "2023-03-01T09:00:00.000Z",
      updatedAt: "2023-03-02T09:00:00.000Z",
    });
    expect(launch.contentDelta.ops.map((op) => op.insert).join("")).toBe(
      "Steps:\n\nSee other\n",
    );
    expect(launch.contentDelta.ops.every((op) => !op.attributes)).toBe(true);
    expect(launch.attachments.map((a) => [a.filename, a.mimeType])).toEqual([
      ["diagram.png", "image/png"],
    ]);
    expect((await launch.attachments[0].getBlob()).size).toBe(4);
    expect(parsed.hasFolders).toBe(true);
    expect(parsed.skipped).toEqual([
      { item: "Old", reason: "In the trash in Joplin" },
    ]);
  });

  it("reports a damaged tar file", async () => {
    const broken = new Uint8Array(1024).fill(7);
    await expect(openTar(new Blob([broken]))).rejects.toThrow(/damaged/);
  });
});
