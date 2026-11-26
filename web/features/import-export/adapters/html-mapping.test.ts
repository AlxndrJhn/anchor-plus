// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { evernoteAdapter } from "./evernote";
import { htmlToDelta } from "./html-mapping";
import { standardNotesAdapter } from "./standard-notes";
import type { ZipArchive } from "./zip";

/** An in-memory archive; jsdom's Blob is enough for what the adapters read. */
function archive(files: Record<string, string>): ZipArchive {
  return {
    names: Object.keys(files),
    has: (path) => path in files,
    text: (path) => {
      if (!(path in files)) throw new Error(path);
      return files[path];
    },
    blob: (path) => new Blob([files[path]]),
  };
}

describe("htmlToDelta", () => {
  it("keeps headings, inline formatting and links", () => {
    expect(
      htmlToDelta(
        '<h1>Trip</h1><p>Pack <b>light</b>, see <a href="https://example.com">map</a></p><h5>Small</h5>',
      ).ops,
    ).toEqual([
      { insert: "Trip" },
      { insert: "\n", attributes: { header: 1 } },
      { insert: "Pack " },
      { insert: "light", attributes: { bold: true } },
      { insert: ", see " },
      { insert: "map", attributes: { link: "https://example.com" } },
      { insert: "\nSmall" },
      { insert: "\n", attributes: { header: 3 } },
    ]);
  });

  it("turns nested lists and both Evernote checklist styles into list lines", () => {
    const ops = htmlToDelta(`<en-note>
      <ul><li>one<ul><li>inner</li></ul></li></ul>
      <ol><li>first</li></ol>
      <div><en-todo checked="true"/>done</div>
      <div><en-todo checked="false"/>open</div>
      <ul style="--en-todo:true;"><li style="--en-checked:true;">new done</li><li style="--en-checked:false;">new open</li></ul>
    </en-note>`).ops;
    const lines = ops.filter((op) => op.insert === "\n");
    expect(lines.map((op) => op.attributes)).toEqual([
      { list: "bullet" },
      { list: "bullet", indent: 1 },
      { list: "ordered" },
      { list: "checked" },
      { list: "unchecked" },
      { list: "checked" },
      { list: "unchecked" },
    ]);
    expect(
      ops.filter((op) => op.insert !== "\n").map((op) => op.insert),
    ).toEqual([
      "one",
      "inner",
      "first",
      "done",
      "open",
      "new done",
      "new open",
    ]);
  });

  it("keeps code spacing and blank lines between paragraphs, but not runs of them", () => {
    expect(
      htmlToDelta(
        "<div>a</div><div><br/></div><div><br/></div><div>b</div><pre>x  = 1\n  y</pre>",
      ).ops,
    ).toEqual([
      { insert: "a\n\nb\nx  = 1" },
      { insert: "\n", attributes: { "code-block": true } },
      { insert: "  y" },
      { insert: "\n", attributes: { "code-block": true } },
    ]);
  });

  it("drops pictures, scripts and unsafe links", () => {
    expect(
      htmlToDelta(
        '<p>a<img src="x.png">b<script>alert(1)</script> <a href="javascript:alert(1)">c</a></p>',
      ).ops,
    ).toEqual([{ insert: "ab c\n" }]);
  });
});

const ENEX = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">
<en-export export-date="20240101T000000Z" application="Evernote" version="10.0">
  <note>
    <title>Groceries &amp; more</title>
    <created>20230415T093000Z</created>
    <updated>20230416T100000Z</updated>
    <tag>home</tag>
    <tag>shopping</tag>
    <note-attributes><author>me</author></note-attributes>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note><div><en-todo checked="true"/>Milk</div><div><en-todo/>Bread</div><en-media hash="abc" type="image/png"/></en-note>]]></content>
    <resource>
      <data encoding="base64">iVBORw0KGgo=</data>
      <mime>image/png</mime>
      <resource-attributes><file-name>receipt.png</file-name></resource-attributes>
    </resource>
    <resource>
      <data encoding="base64">JVBERi0=</data>
      <mime>application/pdf</mime>
    </resource>
  </note>
  <note>
    <title>Secret</title>
    <content><![CDATA[<en-note><div>Open</div><en-crypt>abc</en-crypt></en-note>]]></content>
  </note>
</en-export>`;

describe("evernoteAdapter", () => {
  it("detects an .enex export", async () => {
    expect(
      await evernoteAdapter.detect(archive({ "Personal.enex": ENEX })),
    ).toBe(true);
    expect(
      await evernoteAdapter.detect(archive({ "notes.enex": "<html></html>" })),
    ).toBe(false);
  });

  it("reads notes, tags, dates and files", async () => {
    const parsed = await evernoteAdapter.parse(
      archive({ "Personal.enex": ENEX }),
    );
    expect(parsed.formatId).toBe("evernote");
    expect(parsed.notes).toHaveLength(2);

    const [groceries, secret] = parsed.notes;
    expect(groceries.title).toBe("Groceries & more");
    expect(groceries.tagNames).toEqual(["home", "shopping"]);
    expect(groceries.createdAt).toBe("2023-04-15T09:30:00.000Z");
    expect(groceries.updatedAt).toBe("2023-04-16T10:00:00.000Z");
    expect(groceries.contentDelta.ops).toEqual([
      { insert: "Milk" },
      { insert: "\n", attributes: { list: "checked" } },
      { insert: "Bread" },
      { insert: "\n", attributes: { list: "unchecked" } },
    ]);
    expect(
      groceries.attachments.map((a) => [a.filename, a.mimeType, a.supported]),
    ).toEqual([
      ["receipt.png", "image/png", true],
      ["Groceries & more-2.pdf", "application/pdf", true],
    ]);
    const png = await groceries.attachments[0].getBlob();
    expect(png.size).toBe(8);

    expect(secret.contentDelta.ops).toEqual([{ insert: "Open\n" }]);
    expect(parsed.skipped).toEqual([
      { item: "Secret", reason: "Encrypted text in this note was left out" },
    ]);
    // One notebook adds nothing as a tag
    expect(parsed.hasFolders).toBeUndefined();
    expect(parsed.tags.map((tag) => tag.name)).toEqual(["home", "shopping"]);
    expect(parsed.attachmentCount).toBe(2);
  });

  it("offers each notebook as a tag when there are several", async () => {
    const parsed = await evernoteAdapter.parse(
      archive({ "Personal.enex": ENEX, "Work.enex": ENEX }),
    );
    expect(parsed.hasFolders).toBe(true);
    expect(parsed.notes.map((note) => note.folderTags)).toEqual([
      ["Personal"],
      ["Personal"],
      ["Work"],
      ["Work"],
    ]);
  });
});

describe("standardNotesAdapter rich text", () => {
  it("reads HTML notes from the old rich text editor", async () => {
    const backup = {
      version: "004",
      items: [
        {
          uuid: "n1",
          content_type: "Note",
          content: {
            title: "Rich",
            text: "<p><strong>Bold</strong> text</p>",
            noteType: "rich-text",
          },
        },
      ],
    };
    const parsed = await standardNotesAdapter.parse(
      archive({ "backup.txt": JSON.stringify(backup) }),
    );
    expect(parsed.notes[0].contentDelta.ops).toEqual([
      { insert: "Bold", attributes: { bold: true } },
      { insert: " text\n" },
    ]);
  });
});
