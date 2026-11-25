// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  describeKey,
  describeQueryKey,
  describeValue,
  keepShape,
  Pseudonyms,
  scrubError,
  scrubStack,
  scrubUrl,
} from "./privacy";

const NOTE_ID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";

describe("keepShape", () => {
  it("keeps names and safe values, hides words", () => {
    expect(keepShape("Note(id: 3, title: Shopping list, pinned: true)")).toBe(
      "Note(id: 3, title: ***, pinned: true)",
    );
  });

  it("hides phone numbers, postcodes and dates", () => {
    const out = keepShape("call 0176123456 at 10115 on 1990-05-01");
    expect(out).not.toMatch(/\d{5}/);
    expect(out).not.toContain("1990");
  });

  it("hides email addresses", () => {
    expect(keepShape("user: jane.doe@example.com")).toBe("user: ***");
  });

  it("turns ids into stand-ins", () => {
    expect(keepShape(`note ${NOTE_ID} failed`, new Pseudonyms())).toBe(
      "*** id1 ***",
    );
  });
});

describe("scrubUrl", () => {
  it("keeps route words, replaces ids and tokens, hides query values", () => {
    const ids = new Pseudonyms();
    expect(scrubUrl(`/notes/${NOTE_ID}?search=milk&tagId=x`, ids)).toBe(
      "/notes/:id1?search=***&tagId=***",
    );
    expect(scrubUrl("/s/Ab3dE5gH9kLmN0pQ", ids)).toBe("/s/:id2");
    expect(scrubUrl(`/notes/${NOTE_ID}`, ids)).toBe("/notes/:id1");
  });

  it("never names another host, and drops fragments", () => {
    const ids = new Pseudonyms();
    expect(scrubUrl("https://my-server.example.org/api/x", ids)).toBe(
      "(other site)",
    );
    expect(scrubUrl(`${location.origin}/notes#key=secret`, ids)).toBe("/notes");
  });

  it("hides names typed into paths", () => {
    expect(
      scrubUrl("/api/files/Tax%20return%202025.pdf", new Pseudonyms()),
    ).toBe("/api/files/:id1");
  });
});

describe("scrubError", () => {
  it("keeps an engine error's message but not what it quotes", () => {
    const e = new SyntaxError(
      `Unexpected token 'D', "Dear Jane" is not valid JSON`,
    );
    expect(scrubError(e, new Pseudonyms()).message).toBe(
      "Unexpected token ***, *** is not valid JSON",
    );
  });

  it("keeps an app error's message to its shape", () => {
    const e = new Error("Couldn't save My secret diary");
    expect(scrubError(e, new Pseudonyms()).message).toBe("***");
  });

  it("drops the host from stack frames", () => {
    const frames = scrubStack(
      [
        "Error: x",
        "    at saveNote (https://notes.example.org/_next/static/chunks/app.js:12:34)",
        "    at https://notes.example.org/_next/static/chunks/main.js:1:2",
      ].join("\n"),
    );
    expect(frames).toEqual(["saveNote (other site):12:34", "(other site):1:2"]);
    const local = scrubStack(
      `Error: x\n    at saveNote (${location.origin}/_next/app.js:12:34)`,
    );
    expect(local).toEqual(["saveNote /_next/app.js:12:34"]);
  });
});

describe("describeValue", () => {
  it("shows the shape of objects, never their strings", () => {
    expect(
      describeValue(
        { id: NOTE_ID, kind: "Diary", count: 3, done: false, tags: ["a"] },
        new Pseudonyms(),
      ),
    ).toBe(
      "Object(id: id1, kind: ***, count: 3, done: false, tags: Array(length: 1, first: ***))",
    );
  });

  it("hides sensitive fields entirely", () => {
    expect(describeValue({ password: 1234, title: 5 }, new Pseudonyms())).toBe(
      "Object(password: ***, title: ***)",
    );
  });
});

describe("describeQueryKey", () => {
  it("keeps the query's name and hides its arguments", () => {
    expect(
      describeQueryKey(
        ["notes", { search: "milk" }, NOTE_ID],
        new Pseudonyms(),
      ),
    ).toEqual(["notes", "Object(search: ***)", "id1"]);
  });
});

describe("describeKey", () => {
  const key = (k: Partial<Parameters<typeof describeKey>[0]>) =>
    describeKey({
      key: "a",
      code: "KeyA",
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      shiftKey: false,
      ...k,
    });

  it("never notes a typed character", () => {
    expect(key({ key: "a" })).toBeNull();
    expect(key({ key: "A", shiftKey: true })).toBeNull();
    expect(key({ key: "7", code: "Digit7" })).toBeNull();
  });

  it("notes named keys, and shortcuts by their physical key", () => {
    expect(key({ key: "Escape", code: "Escape" })).toBe("Escape");
    expect(
      key({
        key: "ß",
        code: "KeyB",
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
      }),
    ).toBe("ctrl+shift+alt+b");
    expect(key({ key: "Control", code: "ControlLeft", ctrlKey: true })).toBe(
      null,
    );
  });
});
