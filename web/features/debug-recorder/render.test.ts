// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWireframe, textBars } from "./render";

const SECRET = "Meet Jane at 12 Elm Street";

/** A 2D context that notes every call and every value it's given. */
function recordingContext() {
  const calls: { name: string; args: unknown[] }[] = [];
  const target = { canvas: { width: 800, height: 600 } };
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return (t as Record<string | symbol, unknown>)[prop];
      return (...args: unknown[]) => {
        calls.push({ name: String(prop), args });
      };
    },
    set(_t, prop, value) {
      calls.push({ name: `set ${String(prop)}`, args: [value] });
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe("renderWireframe", () => {
  beforeEach(() => {
    // jsdom does no layout: give every element and line of text a box.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 10, y: 10, width: 200, height: 40 }),
    );
    Range.prototype.getClientRects = () =>
      [
        DOMRect.fromRect({ x: 20, y: 20, width: 150, height: 16 }),
      ] as unknown as DOMRectList;
    vi.stubGlobal(
      "Path2D",
      class {
        arc() {}
        moveTo() {}
        lineTo() {}
        roundRect() {}
        ellipse() {}
        closePath() {}
      },
    );
    document.body.innerHTML = `
      <main style="background: rgb(250, 250, 250)">
        <h1>${SECRET}</h1>
        <p contenteditable="true">${SECRET} <b>${SECRET}</b></p>
        <input value="${SECRET}" placeholder="${SECRET}">
        <textarea>${SECRET}</textarea>
        <img src="https://example.com/photo.jpg" alt="${SECRET}">
        <canvas></canvas>
        <svg viewBox="0 0 10 10"><text>${SECRET}</text></svg>
        <svg class="lucide" viewBox="0 0 24 24"><path d="M5 12h14"/><text>${SECRET}</text></svg>
        <div style="background-image: url(https://example.com/a.png)">${SECRET}</div>
        <div data-skip>${SECRET}</div>
      </main>`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("never draws text or copies a picture", () => {
    const { ctx, calls } = recordingContext();
    renderWireframe(ctx, 1, (el) => el.hasAttribute("data-skip"));
    expect(calls.length).toBeGreaterThan(10);
    const names = new Set(calls.map((c) => c.name));
    for (const banned of [
      "fillText",
      "strokeText",
      "drawImage",
      "putImageData",
      "createPattern",
      "getImageData",
    ])
      expect(names.has(banned)).toBe(false);
    const values = JSON.stringify(calls.map((c) => c.args));
    for (const word of ["Jane", "Elm", "example.com", "photo"])
      expect(values).not.toContain(word);
  });

  it("draws text as bars", () => {
    const { ctx, calls } = recordingContext();
    renderWireframe(ctx, 1, () => false);
    expect(calls.filter((c) => c.name === "roundRect").length).toBeGreaterThan(
      3,
    );
  });
});

describe("textBars", () => {
  it("joins a line's pieces into one bar on the grid", () => {
    const bars = textBars([
      { x: 3, y: 0, w: 40, h: 20 },
      { x: 45, y: 1, w: 30, h: 18 },
      { x: 3, y: 24, w: 10, h: 20 },
    ]);
    expect(bars).toHaveLength(2);
    expect(bars[0].x).toBe(0);
    expect(bars[0].w).toBe(80);
    expect(bars[1].w).toBe(16);
  });
});
