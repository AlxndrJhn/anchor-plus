import { translate } from "@/lib/i18n";

// Every emoji, for the drawing pad's picker, grouped and searched as
// WhatsApp does. The data (emojibase, English) ships with the app, so it
// works offline, and is only loaded when the picker opens.

/** One emoji, as emojibase's compact data has it. */
export interface Emoji {
  hexcode: string;
  label: string;
  unicode: string;
  group?: number;
  order?: number;
  tags?: string[];
  emoticon?: string | string[];
  skins?: Emoji[];
}

export type EmojiCategoryId =
  | "recent"
  | "people"
  | "nature"
  | "food"
  | "activity"
  | "travel"
  | "objects"
  | "symbols"
  | "flags";

export interface EmojiSection {
  id: EmojiCategoryId;
  label: string;
  emojis: Emoji[];
}

/** WhatsApp's categories and order, as emojibase's groups. */
export const EMOJI_CATEGORIES: {
  id: Exclude<EmojiCategoryId, "recent">;
  label: string;
  groups: number[];
}[] = [
  {
    id: "people",
    get label() {
      return translate("noteHooks.emoji")("categories.people");
    },
    groups: [0, 1],
  },
  {
    id: "nature",
    get label() {
      return translate("noteHooks.emoji")("categories.nature");
    },
    groups: [3],
  },
  {
    id: "food",
    get label() {
      return translate("noteHooks.emoji")("categories.food");
    },
    groups: [4],
  },
  {
    id: "activity",
    get label() {
      return translate("noteHooks.emoji")("categories.activity");
    },
    groups: [6],
  },
  {
    id: "travel",
    get label() {
      return translate("noteHooks.emoji")("categories.travel");
    },
    groups: [5],
  },
  {
    id: "objects",
    get label() {
      return translate("noteHooks.emoji")("categories.objects");
    },
    groups: [7],
  },
  {
    id: "symbols",
    get label() {
      return translate("noteHooks.emoji")("categories.symbols");
    },
    groups: [8],
  },
  {
    id: "flags",
    get label() {
      return translate("noteHooks.emoji")("categories.flags");
    },
    groups: [9],
  },
];

/** Splits emojis into the categories, in emojibase's order. */
export function groupEmojis(emojis: readonly Emoji[]): EmojiSection[] {
  return EMOJI_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    emojis: emojis
      .filter((e) => e.group !== undefined && category.groups.includes(e.group))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  }));
}

const words = (text: string) => text.toLowerCase().split(/[\s:_,-]+/);

/**
 * Emojis matching every word typed, by name, tag or emoticon: whole names
 * first, then names with a word starting so, then tags.
 */
export function searchEmojis(emojis: readonly Emoji[], query: string) {
  const terms = words(query.trim()).filter(Boolean);
  if (!terms.length) return [];
  const scored: { emoji: Emoji; score: number }[] = [];
  for (const emoji of emojis) {
    const label = emoji.label.toLowerCase();
    const labelWords = words(label);
    const tags = emoji.tags ?? [];
    const emoticons = [emoji.emoticon ?? []].flat();
    let score = 0;
    for (const term of terms) {
      if (label === term) score += 4;
      else if (label.startsWith(term)) score += 3;
      else if (labelWords.some((w) => w.startsWith(term))) score += 2;
      else if (tags.some((t) => t.startsWith(term)) || emoticons.includes(term))
        score += 1;
      else {
        score = 0;
        break;
      }
    }
    if (score) scored.push({ emoji, score });
  }
  return scored
    .sort(
      (a, b) =>
        b.score - a.score || (a.emoji.order ?? 0) - (b.emoji.order ?? 0),
    )
    .map((s) => s.emoji);
}

/** Puts `unicode` first in the recently used, keeping at most `max`. */
export function addRecent(
  recent: readonly string[],
  unicode: string,
  max = 32,
) {
  return [unicode, ...recent.filter((e) => e !== unicode)].slice(0, max);
}

const RECENT_KEY = "anchor.drawing.recent-emojis";
const SKINS_KEY = "anchor.drawing.emoji-skins";

/** Browser storage can be missing or refuse; the picker works without it. */
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not kept; fine for a convenience.
  }
}

export const loadRecentEmojis = () =>
  readJson<string[]>(RECENT_KEY, []).filter((e) => typeof e === "string");
export const saveRecentEmojis = (recent: string[]) =>
  writeJson(RECENT_KEY, recent);

/** The skin tone picked for each emoji that has them, by its hexcode. */
export const loadEmojiSkins = () =>
  readJson<Record<string, string>>(SKINS_KEY, {});
export const saveEmojiSkins = (skins: Record<string, string>) =>
  writeJson(SKINS_KEY, skins);

/**
 * Whether this device's font draws the emoji as one picture. Only the
 * newer ones (joined sequences, and the latest block) are checked: an
 * older font draws a joined one as its parts side by side, and a new one
 * as an empty box with no colour.
 */
export function makeEmojiCheck(): (emoji: Emoji) => boolean {
  let context: CanvasRenderingContext2D | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    context = canvas.getContext("2d", { willReadFrequently: true });
  } catch {
    context = null;
  }
  if (!context) return () => true;
  const ctx = context;
  ctx.font = "20px sans-serif";
  ctx.textBaseline = "top";
  const oneWidth = ctx.measureText("😀").width || 20;
  return (emoji) => {
    const joined = emoji.unicode.includes("‍");
    const code = emoji.unicode.codePointAt(0) ?? 0;
    const newest = code >= 0x1fa70 && code <= 0x1faff;
    if (!joined && !newest) return true;
    if (ctx.measureText(emoji.unicode).width > oneWidth * 1.5) return false;
    if (!newest) return true;
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillText(emoji.unicode, 0, 0);
    const pixels = ctx.getImageData(0, 0, 24, 24).data;
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b, a] = [
        pixels[i],
        pixels[i + 1],
        pixels[i + 2],
        pixels[i + 3],
      ];
      if (a > 0 && (Math.abs(r - g) > 20 || Math.abs(g - b) > 20)) return true;
    }
    return false;
  };
}

let loaded: Promise<Emoji[]> | null = null;

/** Every emoji this device can draw, loaded once. */
export function loadEmojis(): Promise<Emoji[]> {
  loaded ??= import("emojibase-data/en/compact.json").then((module) => {
    const all = (module.default as unknown as Emoji[]).filter(
      (e) => e.group !== undefined && e.group !== 2,
    );
    const canDraw = makeEmojiCheck();
    return all
      .filter(canDraw)
      .map((e) => (e.skins ? { ...e, skins: e.skins.filter(canDraw) } : e));
  });
  loaded.catch(() => {
    loaded = null;
  });
  return loaded;
}
