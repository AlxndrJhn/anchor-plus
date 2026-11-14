import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/locales";

type Tree = { [key: string]: string | Tree };

const root = import.meta.dirname;

const read = (locale: string): Tree =>
  Object.fromEntries(
    readdirSync(join(root, locale))
      .filter((name) => name.endsWith(".json"))
      .map((name) => [
        name.slice(0, -".json".length),
        JSON.parse(readFileSync(join(root, locale, name), "utf8")),
      ]),
  );

/** Every message as "part.key.subkey" → text. */
function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const entry of flatten(value, path)) out.set(...entry);
  }
  return out;
}

/**
 * The arguments ({name}, {count, plural, …}) and rich text tags (<b>) of an
 * ICU message, as "name", "count:plural" and "<b>". Plural and select
 * options may differ between languages (Polish has few and many), so only
 * their arguments are compared, and each must have an "other".
 */
function messageParts(message: string): string[] {
  const parts = new Set<string>();
  let i = 0;

  const skipSpace = () => {
    while (/\s/.test(message[i] ?? "")) i++;
  };
  const word = () => {
    const start = i;
    while (i < message.length && /[^\s,{}]/.test(message[i])) i++;
    return message.slice(start, i);
  };

  // Text up to a closing brace (or the end), taking arguments as they come.
  function text(): void {
    while (i < message.length && message[i] !== "}") {
      const char = message[i];
      if (char === "'" && message[i + 1] === "'") i += 2;
      else if (char === "'" && /[{}<#]/.test(message[i + 1] ?? "")) {
        // A quoted literal: '{' or '{literal}'.
        const end = message.indexOf("'", i + 1);
        i = end === -1 ? message.length : end + 1;
      } else if (char === "{") argument();
      else if (char === "<") {
        const tag = /^<\/?([A-Za-z][\w-]*)\s*\/?>/.exec(message.slice(i));
        if (tag) {
          parts.add(`<${tag[1]}>`);
          i += tag[0].length;
        } else i++;
      } else i++;
    }
  }

  function argument(): void {
    i++; // {
    skipSpace();
    const name = word();
    skipSpace();
    if (message[i] === "}") {
      parts.add(name);
      i++;
      return;
    }
    i++; // ,
    skipSpace();
    const type = word();
    skipSpace();
    parts.add(`${name}:${type}`);
    if (message[i] === "}") {
      i++;
      return;
    }
    i++; // ,
    if (!["plural", "select", "selectordinal"].includes(type)) {
      // A style, like {when, date, short}.
      while (i < message.length && message[i] !== "}") i++;
      i++;
      return;
    }
    const options: string[] = [];
    for (;;) {
      skipSpace();
      if (message[i] === "}" || i >= message.length) break;
      const option = word();
      if (option.startsWith("offset:")) continue;
      options.push(option);
      skipSpace();
      if (message[i] !== "{") throw new Error(`Bad option in: ${message}`);
      i++;
      text();
      i++; // }
    }
    i++; // }
    if (!options.includes("other"))
      throw new Error(`No "other" option in: ${message}`);
  }

  text();
  if (i < message.length) throw new Error(`Unbalanced braces in: ${message}`);
  return [...parts].sort();
}

const english = flatten(read("en"));

describe("messages", () => {
  it("reads arguments, plurals and tags", () => {
    expect(
      messageParts(
        "Hi <b>{name}</b>, {count, plural, one {# note} other {# notes in {tag}}}",
      ),
    ).toEqual(["<b>", "count:plural", "name", "tag"]);
    expect(messageParts("It’s '{'literal'}'")).toEqual([]);
  });

  it("every language has a file for each part of the app", () => {
    const parts = (locale: string) =>
      readdirSync(join(root, locale)).filter((n) => n.endsWith(".json"));
    for (const locale of LOCALES) expect(parts(locale)).toEqual(parts("en"));
  });

  for (const locale of LOCALES.filter((l) => l !== "en")) {
    describe(locale, () => {
      const translated = flatten(read(locale));

      it("has the same keys as English", () => {
        const missing = [...english.keys()].filter((k) => !translated.has(k));
        const extra = [...translated.keys()].filter((k) => !english.has(k));
        expect({ missing, extra }).toEqual({ missing: [], extra: [] });
      });

      it("keeps each message's placeholders, plurals and tags", () => {
        const differing = [...english]
          .filter(([key]) => translated.has(key))
          .filter(
            ([key, text]) =>
              messageParts(text).join() !==
              messageParts(translated.get(key) ?? "").join(),
          )
          .map(([key]) => key);
        expect(differing).toEqual([]);
      });
    });
  }

  it("every English message parses", () => {
    for (const text of english.values())
      expect(() => messageParts(text)).not.toThrow();
  });
});
