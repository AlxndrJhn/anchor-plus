// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { NoteBody } from "./components/note-body";
import { deltaToBlocks } from "./note-blocks";

// React's act() warns without it.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const code = (lines: string[]) =>
  JSON.stringify({
    ops: lines.flatMap((line) => [
      { insert: line },
      { insert: "\n", attributes: { "code-block": "plain" } },
    ]),
  });

function render(content: string, variant: "card" | "full") {
  const host = document.createElement("div");
  const root = createRoot(host);
  act(() =>
    root.render(<NoteBody blocks={deltaToBlocks(content)} variant={variant} />),
  );
  return { host, unmount: () => act(() => root.unmount()) };
}

describe("code lines in a note body", () => {
  it("gives each line its own indentation to wrap under", () => {
    const { host, unmount } = render(
      code(["if (a) {", "    b();", "", "\tc();", "}"]),
      "full",
    );
    const lines = [
      ...host.querySelectorAll<HTMLElement>("pre.code .code-line"),
    ];
    expect(lines.map((line) => line.textContent)).toEqual([
      "if (a) {",
      "    b();",
      "",
      "\tc();",
      "}",
    ]);
    expect(
      lines.map((line) => line.style.getPropertyValue("--code-indent")),
    ).toEqual(["", "4", "", "4", ""]);
    // An empty line keeps its height.
    expect(lines[2].querySelector("br")).not.toBeNull();
    unmount();
  });

  it("leaves a card's code preview as plain text", () => {
    const { host, unmount } = render(code(["    indented"]), "card");
    expect(host.querySelector("pre.code .code-line")).toBeNull();
    expect(host.querySelector("pre.code")?.textContent).toBe("    indented");
    unmount();
  });
});
