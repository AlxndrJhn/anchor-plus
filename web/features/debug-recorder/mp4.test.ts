import { describe, expect, it } from "vitest";
import { findBox, muxDebugMp4, readDebugSummary } from "./mp4";

const jpeg = (n: number) => new Uint8Array([0xff, 0xd8, n, 0xff, 0xd9]);
const typeAt = (file: Uint8Array, at: number) =>
  String.fromCharCode(...file.subarray(at + 4, at + 8));

describe("muxDebugMp4", () => {
  const file = muxDebugMp4({
    video: {
      kind: "jpeg",
      width: 4,
      height: 2,
      samples: [
        { tMs: 0, data: jpeg(1), key: true },
        { tMs: 40, data: jpeg(2), key: true },
      ],
    },
    durationMs: 100,
    events: [
      { tMs: 10, json: '{"type":"a"}' },
      { tMs: 10, json: '{"type":"b"}' },
    ],
    summary: '{"format":"anchor-debug/1"}',
  });
  const view = new DataView(file.buffer);

  it("lays out ftyp, moov, then mdat", () => {
    expect(typeAt(file, 0)).toBe("ftyp");
    expect(typeAt(file, view.getUint32(0))).toBe("moov");
    const moov = findBox(file, ["moov"]) as [number, number];
    expect(typeAt(file, moov[1])).toBe("mdat");
  });

  it("stores the summary where readDebugSummary finds it", () => {
    expect(readDebugSummary(file)).toBe('{"format":"anchor-debug/1"}');
  });

  it("has a video and a metadata track", () => {
    const moov = findBox(file, ["moov"]) as [number, number];
    const handlers: string[] = [];
    for (let at = moov[0]; at < moov[1]; at += view.getUint32(at)) {
      if (typeAt(file, at) !== "trak") continue;
      const end = at + view.getUint32(at);
      const [s] = findBox(file, ["mdia", "hdlr"], at + 8, end) as [
        number,
        number,
      ];
      handlers.push(String.fromCharCode(...file.subarray(s + 8, s + 12)));
    }
    expect(handlers).toEqual(["vide", "meta"]);
  });

  it("groups events of one moment and fills the gap before the first", () => {
    const text = new TextDecoder("latin1").decode(file);
    expect(text).toContain('[{"type":"a"},{"type":"b"}]');
    expect(text).toContain("[]");
  });

  it("refuses a recording without frames", () => {
    expect(() =>
      muxDebugMp4({
        video: { kind: "jpeg", width: 2, height: 2, samples: [] },
        durationMs: 10,
      }),
    ).toThrow();
  });
});
