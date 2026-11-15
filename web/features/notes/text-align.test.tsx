// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { NoteBody } from "./components/note-body";
import { deltaToBlocks } from "./note-blocks";
import {
  QUILL_FORMATS,
  QUILL_MODULES,
  type QuillInstance,
  setLineAlign,
} from "./quill";
import { registerNoteFormats } from "./quill-formats";
import { alignmentOf, buildAlignDelta } from "./quill-lines";

// React's act() warns without it.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** As Android stores it too: `align` on the line's newline. */
const ops = [
  { insert: "Garden party" },
  { insert: "\n", attributes: { header: 1, align: "center" } },
  { insert: "Bring a dish" },
  { insert: "\n", attributes: { align: "justify" } },
  { insert: "Lemonade" },
  { insert: "\n", attributes: { list: "bullet", align: "right" } },
  { insert: "plain\nconst a = 1;" },
  { insert: "\n", attributes: { "code-block": "plain" } },
];

// jsdom lays nothing out; Quill measures the selection when it focuses.
Range.prototype.getBoundingClientRect = () => new DOMRect();
Range.prototype.getClientRects = () =>
  [] as unknown as ReturnType<Range["getClientRects"]>;

async function makeQuill(): Promise<QuillInstance> {
  const { Quill } = await import("react-quill-new");
  registerNoteFormats(
    Quill as unknown as Parameters<typeof registerNoteFormats>[0],
  );
  const host = document.createElement("div");
  document.body.append(host);
  const quill = new Quill(host, {
    formats: [...QUILL_FORMATS],
    modules: { ...QUILL_MODULES, keyboard: QUILL_MODULES.keyboard },
  });
  return quill as unknown as QuillInstance;
}

describe("alignmentOf", () => {
  it("reads the three stored values and takes anything else as left", () => {
    expect(alignmentOf("center")).toBe("center");
    expect(alignmentOf("right")).toBe("right");
    expect(alignmentOf("justify")).toBe("justify");
    expect(alignmentOf("left")).toBe("left");
    expect(alignmentOf(undefined)).toBe("left");
    expect(alignmentOf("middle")).toBe("left");
  });
});

describe("buildAlignDelta", () => {
  const doc = { ops: [{ insert: "one\ntwo\nthree\n" }] };

  it("aligns the caret's line", () => {
    expect(buildAlignDelta(doc, 5, 0, "center")).toEqual({
      ops: [{ retain: 7 }, { retain: 1, attributes: { align: "center" } }],
    });
  });

  it("aligns every selected line, but not one the selection only reaches", () => {
    expect(buildAlignDelta(doc, 1, 7, "right")).toEqual({
      ops: [
        { retain: 3 },
        { retain: 1, attributes: { align: "right" } },
        { retain: 3 },
        { retain: 1, attributes: { align: "right" } },
      ],
    });
  });

  it("stores left as no alignment, and leaves code and lines already so", () => {
    expect(buildAlignDelta({ ops }, 0, 60, "left")?.ops).toEqual([
      { retain: 12 },
      { retain: 1, attributes: { align: null } },
      { retain: 12 },
      { retain: 1, attributes: { align: null } },
      { retain: 8 },
      { retain: 1, attributes: { align: null } },
    ]);
    expect(buildAlignDelta(doc, 0, 0, "left")).toBeNull();
  });
});

describe("text alignment", () => {
  it("round-trips the stored alignment through the editor, as text-align", async () => {
    const quill = await makeQuill();
    quill.setContents({ ops });
    expect(quill.getContents().ops).toEqual(ops);
    const root = quill.root;
    expect(root.querySelector("h1")?.style.textAlign).toBe("center");
    expect(root.querySelector("p")?.style.textAlign).toBe("justify");
    expect(root.querySelector("li")?.style.textAlign).toBe("right");
  });

  it("aligns from the toolbar's helper, skipping code", async () => {
    const quill = await makeQuill();
    quill.setContents({ ops: [{ insert: "a\nb" }, ...ops.slice(-1)] });
    quill.setSelection(0, 4, "silent");
    setLineAlign(quill, "center");
    expect(quill.getContents().ops).toEqual([
      { insert: "a" },
      { insert: "\n", attributes: { align: "center" } },
      { insert: "b" },
      { insert: "\n", attributes: { "code-block": "plain" } },
    ]);
  });

  it("aligns with Ctrl+Shift+E, L, R and J", async () => {
    const quill = await makeQuill();
    quill.setContents({ ops: [{ insert: "hello\n" }] });
    quill.setSelection(2, 0, "silent");
    const press = (key: string) =>
      quill.root.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          keyCode: key.charCodeAt(0),
          which: key.charCodeAt(0),
          ctrlKey: true,
          metaKey: false,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        } as KeyboardEventInit),
      );
    const align = () => quill.getContents().ops[1]?.attributes?.align;
    press("E");
    expect(align()).toBe("center");
    press("R");
    expect(align()).toBe("right");
    press("J");
    expect(align()).toBe("justify");
    press("L");
    expect(quill.getContents().ops).toEqual([{ insert: "hello\n" }]);
  });

  it("lays out aligned lines on cards and in the full view, but not code", () => {
    const blocks = deltaToBlocks(JSON.stringify({ ops }));
    expect(blocks.map((block) => block.align)).toEqual([
      "center",
      "justify",
      "right",
      undefined,
      undefined,
    ]);
    for (const variant of ["card", "full"] as const) {
      const host = document.createElement("div");
      const root = createRoot(host);
      act(() => root.render(<NoteBody blocks={blocks} variant={variant} />));
      const heading = host.querySelector<HTMLElement>(".x-h1");
      expect(heading?.style.textAlign).toBe("center");
      expect(host.querySelector<HTMLElement>("li")?.style.textAlign).toBe(
        "right",
      );
      const paragraphs = [...host.querySelectorAll<HTMLElement>("p")].filter(
        (p) => !p.classList.contains("x-h1"),
      );
      expect(paragraphs.map((p) => p.style.textAlign)).toEqual(["justify", ""]);
      act(() => root.unmount());
    }
  });
});
