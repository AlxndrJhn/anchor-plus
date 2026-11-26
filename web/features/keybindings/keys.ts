/**
 * Key strings as in VS Code's keybindings.json: "ctrl+shift+k", "g n" (a
 * chord: one stroke, then the next), "mod+\\" (Ctrl, or ⌘ on a Mac).
 *
 * A stroke is written modifiers first, in the order ctrl, shift, alt, meta,
 * then the key. Letters and named keys are lowercase. A character typed
 * without Ctrl, Alt or ⌘ is the character itself ("?", "#"), whatever it
 * takes on this keyboard; with them, it is the key that was pressed, so
 * Ctrl+Shift+; stays itself on any layout.
 */

import { translate } from "@/lib/i18n";

const MODIFIERS = ["ctrl", "shift", "alt", "meta"] as const;

/** Why a rule can't be read, in the language on screen. */
const problem = () => translate("keybindings.errors");
type Modifier = (typeof MODIFIERS)[number];

const MODIFIER_ALIASES: Record<string, Modifier | "mod"> = {
  ctrl: "ctrl",
  control: "ctrl",
  shift: "shift",
  alt: "alt",
  option: "alt",
  opt: "alt",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  win: "meta",
  super: "meta",
  mod: "mod",
};

/** `KeyboardEvent.key` of keys that have a name, as written here. */
const NAMED_KEYS: Record<string, string> = {
  Enter: "enter",
  Escape: "escape",
  " ": "space",
  Tab: "tab",
  Backspace: "backspace",
  Delete: "delete",
  Insert: "insert",
  Home: "home",
  End: "end",
  PageUp: "pageup",
  PageDown: "pagedown",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ContextMenu: "contextmenu",
};

const KEY_ALIASES: Record<string, string> = {
  esc: "escape",
  return: "enter",
  del: "delete",
  ins: "insert",
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  plus: "+",
  spacebar: "space",
};

const NAMED = new Set([
  ...Object.values(NAMED_KEYS),
  ...Array.from({ length: 24 }, (_, i) => `f${i + 1}`),
]);

/** Punctuation keys by `KeyboardEvent.code`, as on a US keyboard. */
const CODE_KEYS: Record<string, string> = {
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  IntlBackslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
  NumpadAdd: "+",
  NumpadSubtract: "-",
  NumpadMultiply: "*",
  NumpadDivide: "/",
  NumpadDecimal: ".",
};

const LONE_MODIFIERS = new Set([
  "Control",
  "Alt",
  "Shift",
  "Meta",
  "AltGraph",
  "OS",
  "Hyper",
  "Super",
  "CapsLock",
  "Fn",
]);

export interface Stroke {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

type KeyLike = Pick<
  KeyboardEvent,
  "ctrlKey" | "altKey" | "shiftKey" | "metaKey" | "code" | "key"
>;

/** The key a `KeyboardEvent.code` stands for: "KeyD" → "d". */
export function keyOfCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return code.slice(6);
  if (/^F\d{1,2}$/.test(code)) return code.toLowerCase();
  return CODE_KEYS[code] ?? null;
}

const isLetter = (c: string) => c.toLowerCase() !== c.toUpperCase();

/** The stroke a key press makes, or null for a lone modifier or a dead key. */
export function strokeFromEvent(e: KeyLike): Stroke | null {
  if (!e.key || LONE_MODIFIERS.has(e.key)) return null;
  if (e.key === "Dead" || e.key === "Unidentified" || e.key === "Process")
    return null;
  const held = e.ctrlKey || e.altKey || e.metaKey;
  let key: string;
  let shift = e.shiftKey;
  const named = NAMED_KEYS[e.key] ?? (/^F\d{1,2}$/.test(e.key) && e.key);
  if (named) key = named.toLowerCase();
  else if (held) key = keyOfCode(e.code) ?? e.key.toLowerCase();
  else if (e.key.length === 1) {
    if (isLetter(e.key)) key = e.key.toLowerCase();
    else {
      // "?" already says Shift was held.
      key = e.key;
      shift = false;
    }
  } else return null;
  return { ctrl: e.ctrlKey, shift, alt: e.altKey, meta: e.metaKey, key };
}

export function strokeToString(s: Stroke): string {
  return [...MODIFIERS.filter((m) => s[m]), s.key].join("+");
}

/**
 * A written stroke; throws on one it can't read. "mod" is Ctrl, or ⌘ on a
 * Mac. "+" alone, or as the last part ("ctrl++"), is the plus key.
 */
export function parseStroke(text: string, mac: boolean): Stroke {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) throw new Error(problem()("emptyKey"));
  const parts = trimmed.endsWith("++")
    ? [...trimmed.slice(0, -2).split("+"), "+"]
    : trimmed === "+"
      ? ["+"]
      : trimmed.split("+");
  const stroke: Stroke = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: "",
  };
  parts.forEach((raw, i) => {
    const part = raw.trim();
    const last = i === parts.length - 1;
    const modifier = MODIFIER_ALIASES[part];
    if (!last) {
      if (!modifier) throw new Error(problem()("unknownModifier", { part }));
      stroke[modifier === "mod" ? (mac ? "meta" : "ctrl") : modifier] = true;
      return;
    }
    const key = KEY_ALIASES[part] ?? part;
    if (!(key.length === 1 || NAMED.has(key)))
      throw new Error(problem()("unknownKey", { part }));
    stroke.key = key;
  });
  return stroke;
}

/** A written chord in its one way of writing, e.g. "Ctrl+K" → "ctrl+k". */
export function normalizeChord(text: string, mac: boolean): string {
  const strokes = text.trim().split(/\s+/);
  if (strokes.length > 2) throw new Error(problem()("chordTooLong"));
  return strokes.map((s) => strokeToString(parseStroke(s, mac))).join(" ");
}

/** With Ctrl, Alt or ⌘: may act from inside a text field. */
export const hasCommandModifier = (s: Stroke) => s.ctrl || s.alt || s.meta;

/**
 * A character typed alone (C, /, #…), which speech input can set off by
 * mistake (WCAG 2.1.4); Settings can turn these off.
 */
export const isSingleCharacter = (s: Stroke) =>
  !hasCommandModifier(s) && s.key.length === 1;

export const isFunctionKey = (s: Stroke) => /^f\d{1,2}$/.test(s.key);

const KEY_LABELS: Record<string, string> = {
  enter: "Enter",
  escape: "Esc",
  space: "Space",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Del",
  insert: "Ins",
  home: "Home",
  end: "End",
  pageup: "PgUp",
  pagedown: "PgDn",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  contextmenu: "Menu",
};

const keyLabel = (key: string) =>
  KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key.toUpperCase());

const MAC_SYMBOLS: Record<Modifier, string> = {
  ctrl: "⌃",
  shift: "⇧",
  alt: "⌥",
  meta: "⌘",
};
const PC_NAMES: Record<Modifier, string> = {
  ctrl: "Ctrl",
  shift: "Shift",
  alt: "Alt",
  meta: "Win",
};

/** The keys of one stroke as they read on this computer: ["Ctrl", "K"]. */
export function strokeLabels(s: Stroke, mac: boolean): string[] {
  const mods = MODIFIERS.filter((m) => s[m]).map((m) =>
    mac ? MAC_SYMBOLS[m] : PC_NAMES[m],
  );
  return [...mods, keyLabel(s.key)];
}

/** Each stroke of a chord, as its keys: [["G"], ["N"]]. */
export function chordLabels(chord: string, mac: boolean): string[][] {
  return chord.split(" ").map((s) => strokeLabels(parseStroke(s, mac), mac));
}

/** A chord as one line of text: "Ctrl+K", "G N", "⌘K ⌘S". */
export function chordText(chord: string, mac: boolean): string {
  return chordLabels(chord, mac)
    .map((keys) => keys.join(mac ? "" : "+"))
    .join(" ");
}

/** For aria-keyshortcuts, which names keys as `KeyboardEvent.key` does. */
export function chordAria(chord: string, mac: boolean): string {
  const ARIA: Record<string, string> = {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    escape: "Escape",
    delete: "Delete",
    space: "Space",
  };
  return chord
    .split(" ")
    .map((text) => {
      const s = parseStroke(text, mac);
      const mods = MODIFIERS.filter((m) => s[m]).map(
        (m) =>
          ({ ctrl: "Control", shift: "Shift", alt: "Alt", meta: "Meta" })[m],
      );
      const key =
        ARIA[s.key] ??
        (s.key.length === 1
          ? s.key.toUpperCase()
          : s.key[0].toUpperCase() + s.key.slice(1));
      return [...mods, key].join("+");
    })
    .join(" ");
}

/** How the recorder writes a pressed stroke: "cmd" on a Mac, "ctrl" elsewhere. */
export function strokeForJson(s: Stroke, mac: boolean): string {
  const text = strokeToString(s);
  return mac ? text.replace(/(^|\+)meta\+/, "$1cmd+") : text;
}

/**
 * A search for keys, as VS Code's: the chord in quotes, such as `"ctrl+k"`.
 * Gives the chord in the rules' own form, or null if the text isn't one.
 */
export function keysInQuery(query: string, mac: boolean): string | null {
  const quoted = /^"([^"]+)"$/.exec(query.trim());
  if (!quoted) return null;
  try {
    return normalizeChord(quoted[1], mac);
  } catch {
    return null;
  }
}

/**
 * Whether a rule's chord answers a search for `wanted`: the same keys, or a
 * chord that starts with them (pressing them waits for its second stroke).
 */
export const chordMatches = (key: string, wanted: string) =>
  key === wanted || key.startsWith(`${wanted} `);
