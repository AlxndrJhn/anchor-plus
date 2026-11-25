import { describe, expect, it } from "vitest";
import { COMMAND_IDS, COMMANDS, CONTEXT_KEYS } from "./commands";
import { addRule, removeRule, replaceRule, resetCommand } from "./edit";
import {
  chordAria,
  chordMatches,
  chordText,
  keysInQuery,
  normalizeChord,
  strokeFromEvent,
  strokeToString,
} from "./keys";
import {
  activeRules,
  DEFAULT_RULES,
  parseJsonc,
  rulesToJson,
  validateRules,
} from "./rules";
import { legacyDateRules } from "./store";
import { parseWhen, whenKeys } from "./when";

const press = (code: string, key: string, mods: Partial<KeyboardEvent> = {}) =>
  ({
    code,
    key,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...mods,
  }) as KeyboardEvent;

const stroke = (...args: Parameters<typeof press>) => {
  const s = strokeFromEvent(press(...args));
  return s && strokeToString(s);
};

describe("keys", () => {
  it("reads a quoted search as keys", () => {
    expect(keysInQuery('"Ctrl+K"', false)).toBe("ctrl+k");
    expect(keysInQuery(' "cmd+k cmd+s" ', true)).toBe("meta+k meta+s");
    expect(keysInQuery("ctrl+k", false)).toBeNull();
    expect(keysInQuery('"hyper+k"', false)).toBeNull();
    expect(keysInQuery('""', false)).toBeNull();
  });

  it("matches a chord by its keys or its first stroke", () => {
    expect(chordMatches("ctrl+k", "ctrl+k")).toBe(true);
    expect(chordMatches("ctrl+k ctrl+s", "ctrl+k")).toBe(true);
    expect(chordMatches("ctrl+k ctrl+s", "ctrl+k ctrl+s")).toBe(true);
    expect(chordMatches("ctrl+shift+k", "ctrl+k")).toBe(false);
    expect(chordMatches("g n", "n")).toBe(false);
  });

  it("writes a press as VS Code does", () => {
    expect(stroke("KeyK", "k", { ctrlKey: true })).toBe("ctrl+k");
    expect(stroke("KeyG", "G", { shiftKey: true })).toBe("shift+g");
    expect(stroke("ArrowUp", "ArrowUp", { altKey: true })).toBe("alt+up");
    expect(stroke("Space", " ")).toBe("space");
    expect(stroke("Delete", "Delete")).toBe("delete");
  });

  it("takes a typed character as itself, whatever Shift it took", () => {
    expect(stroke("Slash", "?", { shiftKey: true })).toBe("?");
    expect(stroke("Digit3", "#", { shiftKey: true })).toBe("#");
    // A German keyboard types # without Shift, on another key.
    expect(stroke("Backslash", "#")).toBe("#");
  });

  it("takes the key, not the character, with Ctrl, Alt or ⌘", () => {
    // Shift turns ";" into ":" on a US keyboard; it's still the same key.
    expect(stroke("Semicolon", ":", { ctrlKey: true, shiftKey: true })).toBe(
      "ctrl+shift+;",
    );
    // Alt on a Mac types "˚" for K.
    expect(stroke("KeyK", "˚", { altKey: true })).toBe("alt+k");
  });

  it("ignores a lone modifier and a dead key", () => {
    expect(strokeFromEvent(press("ShiftLeft", "Shift"))).toBeNull();
    expect(strokeFromEvent(press("Quote", "Dead"))).toBeNull();
  });

  it("reads keys in any spelling, mod as Ctrl or ⌘", () => {
    expect(normalizeChord("Ctrl+Shift+K", false)).toBe("ctrl+shift+k");
    expect(normalizeChord("shift+ctrl+k", false)).toBe("ctrl+shift+k");
    expect(normalizeChord("mod+k", false)).toBe("ctrl+k");
    expect(normalizeChord("mod+k", true)).toBe("meta+k");
    expect(normalizeChord("cmd+k cmd+s", true)).toBe("meta+k meta+s");
    expect(normalizeChord("esc", false)).toBe("escape");
    expect(normalizeChord("ctrl++", false)).toBe("ctrl++");
    expect(() => normalizeChord("hyper+k", false)).toThrow(/modifier/);
    expect(() => normalizeChord("ctrl+banana", false)).toThrow(/key/);
    expect(() => normalizeChord("a b c", false)).toThrow(/two/);
  });

  it("shows keys as they read on the computer", () => {
    expect(chordText("ctrl+shift+k", false)).toBe("Ctrl+Shift+K");
    expect(chordText("meta+k meta+s", true)).toBe("⌘K ⌘S");
    expect(chordText("g n", false)).toBe("G N");
    expect(chordText("delete", false)).toBe("Del");
    expect(chordAria("ctrl+delete", false)).toBe("Control+Delete");
  });
});

describe("when clauses", () => {
  const ctx = (values: Record<string, unknown>) => (key: string) =>
    values[key] as string | boolean | undefined;

  it("reads and, or, not, parentheses and comparisons", () => {
    const when = parseWhen("noteOpen && !cardFocus || view == 'trash'");
    expect(when(ctx({ noteOpen: true }))).toBe(true);
    expect(when(ctx({ noteOpen: true, cardFocus: true }))).toBe(false);
    expect(when(ctx({ view: "trash" }))).toBe(true);
    expect(parseWhen("!(a || b)")(ctx({ b: true }))).toBe(false);
    expect(parseWhen("view != notes")(ctx({ view: "archive" }))).toBe(true);
    expect(parseWhen("")(ctx({}))).toBe(true);
  });

  it("says what's wrong with one it can't read", () => {
    expect(() => parseWhen("a &&")).toThrow();
    expect(() => parseWhen("(a")).toThrow(/parenthesis/);
    expect(() => parseWhen("view == 'x")).toThrow(/quote/);
  });

  it("lists the context keys it reads", () => {
    expect(whenKeys("a && !b || view == 'notes'")).toEqual(["a", "b", "view"]);
  });
});

describe("default keybindings", () => {
  it("are all readable, for known commands and context keys", () => {
    expect(validateRules(DEFAULT_RULES, false)).toEqual([]);
    expect(validateRules(DEFAULT_RULES, true)).toEqual([]);
  });

  it("give every command a title in each language", async () => {
    for (const locale of ["en", "de", "pl"]) {
      const messages = (await import(`@/messages/${locale}/keybindings.json`))
        .default;
      for (const id of COMMAND_IDS) {
        const [group, name] = id.split(".");
        expect(
          messages.commands[group]?.[name],
          `${locale} ${id}`,
        ).toBeTruthy();
      }
      for (const key of CONTEXT_KEYS)
        expect(messages.context[key], `${locale} ${key}`).toBeTruthy();
    }
  });

  it("keep the shortcuts the app had", () => {
    const keys = (id: string) =>
      activeRules([], false)
        .filter((r) => r.command === id)
        .map((r) => r.key);
    expect(keys("app.search")).toEqual(["/", "ctrl+k"]);
    expect(keys("app.goToArchive")).toEqual(["g a"]);
    expect(keys("note.close")).toEqual(["escape", "ctrl+enter"]);
    expect(keys("editor.insertDate")).toEqual(["ctrl+;"]);
    expect(keys("editor.insertDateTime")).toEqual(["ctrl+shift+;"]);
    expect(COMMANDS.length).toBe(COMMAND_IDS.size);
  });
});

describe("user keybindings", () => {
  it("take a default away with -command, then add their own after", () => {
    const rules = activeRules(
      [
        { key: "n", command: "-app.newNote" },
        { key: "alt+n", command: "app.newNote" },
        { key: "/", command: "-app.search", when: "searchField" },
      ],
      false,
    );
    const of = (id: string) => rules.filter((r) => r.command === id);
    expect(of("app.newNote").map((r) => [r.key, r.source])).toEqual([
      ["alt+n", "user"],
    ]);
    expect(of("app.search").map((r) => r.key)).toEqual(["ctrl+k"]);
  });

  it("say what's wrong with each rule", () => {
    const problems = validateRules(
      [
        { key: "ctrl+k", command: "app.nope" },
        { command: "app.newNote" },
        { key: "ctrl+banana", command: "app.newNote" },
        { key: "n", command: "app.newNote", when: "notesList &&" },
        { key: "n", command: "app.newNote", when: "noteOpn" },
        { command: "-app.newNote" },
      ],
      false,
    );
    expect(problems.map((p) => p.index)).toEqual([0, 1, 2, 3, 4]);
    expect(problems[0].message).toMatch(/no command/);
    expect(problems[4].message).toMatch(/noteOpn/);
    expect(validateRules({}, false)[0].index).toBe(-1);
  });

  it("read JSON with comments and trailing commas, as VS Code allows", () => {
    expect(
      parseJsonc(`[
        // mine
        { "key": "ctrl+n", "command": "app.newNote", }, /* more */
      ]`),
    ).toEqual([{ key: "ctrl+n", command: "app.newNote" }]);
    expect(parseJsonc(`[{ "key": "//", "command": "x" }]`)).toEqual([
      { key: "//", command: "x" },
    ]);
  });

  it("write one rule a line, and read back the same", () => {
    const rules = [
      { key: "ctrl+n", command: "app.newNote" },
      { key: "x", command: "-list.toggleSelect", when: "cardFocus" },
    ];
    expect(parseJsonc(rulesToJson(rules))).toEqual(rules);
    expect(rulesToJson([])).toBe("[]");
  });
});

describe("editing on the page", () => {
  const defaultRow = activeRules([], false).find(
    (r) => r.command === "list.togglePin",
  );
  if (!defaultRow) throw new Error("no default");

  it("replaces a default by taking it away and adding the new key", () => {
    const user = replaceRule([], defaultRow, "p", defaultRow.when);
    expect(user).toEqual([
      { key: "f", command: "-list.togglePin", when: "cardFocus || selecting" },
      { key: "p", command: "list.togglePin", when: "cardFocus || selecting" },
    ]);
    const rules = activeRules(user, false).filter(
      (r) => r.command === "list.togglePin",
    );
    expect(rules.map((r) => r.key)).toEqual(["p"]);
    // Changing the user's rule edits it in place.
    const again = replaceRule(user, rules[0], "shift+p", undefined);
    expect(again[1]).toEqual({ key: "shift+p", command: "list.togglePin" });
  });

  it("adds, removes and resets", () => {
    const added = addRule([], "app.newNote", "alt+n", " ");
    expect(added).toEqual([{ key: "alt+n", command: "app.newNote" }]);
    const userRow = activeRules(added, false).find((r) => r.source === "user");
    if (!userRow) throw new Error("no user rule");
    expect(removeRule(added, userRow)).toEqual([]);
    expect(removeRule([], defaultRow)).toEqual([
      { key: "f", command: "-list.togglePin", when: "cardFocus || selecting" },
    ]);
    expect(
      resetCommand(
        [...added, { key: "f", command: "-list.togglePin" }],
        "app.newNote",
      ),
    ).toEqual([{ key: "f", command: "-list.togglePin" }]);
  });
});

describe("date shortcuts from before keybindings", () => {
  const shortcut = (code: string, mods: object) => ({
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    code,
    label: "",
    ...mods,
  });

  it("become user rules replacing the defaults", () => {
    const rules = legacyDateRules({
      dateShortcut: shortcut("KeyD", { alt: true, shift: true }),
      dateTimeShortcut: shortcut("Semicolon", { ctrl: true, shift: true }),
    });
    // The second is the default, so nothing changes for it.
    expect(rules).toEqual([
      { key: "ctrl+;", command: "-editor.insertDate" },
      { key: "shift+alt+d", command: "editor.insertDate", when: "editorFocus" },
    ]);
    const date = activeRules(rules, false).filter(
      (r) => r.command === "editor.insertDate",
    );
    expect(date.map((r) => r.key)).toEqual(["shift+alt+d"]);
  });
});

describe("conflicts", () => {
  it("are rules with the same key and when clause, not just the same key", async () => {
    const { conflictsOf } = await import("./rules");
    const defaults = activeRules([], false);
    // F pins a card and pins an open note: different contexts.
    const pin = defaults.find((r) => r.command === "list.togglePin");
    if (!pin) throw new Error("no rule");
    expect(conflictsOf(pin, defaults)).toEqual([]);
    const user = activeRules(
      [{ key: "f", command: "list.open", when: "cardFocus || selecting" }],
      false,
    );
    expect(conflictsOf(pin, user).map((r) => r.command)).toEqual(["list.open"]);
  });

  it("are none among the defaults", () => {
    const defaults = activeRules([], false);
    const clashes = defaults.filter((r) =>
      defaults.some(
        (o) =>
          o !== r &&
          o.key === r.key &&
          o.command !== r.command &&
          o.when === r.when,
      ),
    );
    expect(clashes).toEqual([]);
  });
});
