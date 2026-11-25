/**
 * Keeps what's personal out of a debug report's text, the way `render.ts`
 * keeps it out of the film: the report says what kind of thing happened,
 * never what the user wrote, which server they use or who they are.
 *
 * The rule throughout is an allowlist: only what is known to be the app's
 * own shape (code names, small numbers, flags, lowercase route words) stays;
 * everything else becomes `***`, and ids become per-report stand-ins.
 */

export const HIDDEN = "***";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_ANYWHERE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Stand-ins for ids, the same one each time within a report: `id1`, `id2`…
 * A report still shows that two requests were about the same note, but no
 * id in it means anything on the user's server.
 */
export class Pseudonyms {
  private readonly map = new Map<string, string>();

  of(value: string): string {
    const key = value.toLowerCase();
    let alias = this.map.get(key);
    if (!alias) {
      alias = `id${this.map.size + 1}`;
      this.map.set(key, alias);
    }
    return alias;
  }

  /** Every uuid in `text` replaced. */
  replaceIn(text: string): string {
    return text.replace(UUID_ANYWHERE, (m) => this.of(m));
  }
}

/** Separators between words of `toString()`-like output. */
const SEPARATOR = /[\s()[\]{}<>,:=;]+/;
const TOKEN = /[^\s()[\]{}<>,:=;]+|[\s()[\]{}<>,:=;]+/g;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
/**
 * Values that say how the app is, not what's in it: flags, small numbers
 * (no phone numbers, postcodes or PINs), enum values, and the id stand-ins.
 */
const SAFE_VALUE =
  /^(?:true|false|null|undefined|NaN|-?\d{1,4}(?:\.\d+)?|[A-Z]\w*\.\w+|id\d+)$/;

/**
 * `description` with only its shape left: names of things (a word right
 * before a colon, bracket or equals sign) and safe values. Every other word
 * is `***`, since a title or a note can't be told from the rest once it's
 * printed; words hidden one after another are one `***`.
 *
 * `Note(id: 3, title: Shopping list, pinned: true)` becomes
 * `Note(id: 3, title: ***, pinned: true)`.
 */
export function keepShape(description: string, ids?: Pseudonyms): string {
  const text = ids ? ids.replaceIn(description) : description;
  const tokens = text.match(TOKEN) ?? [];
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (SEPARATOR.test(t[0])) {
      out.push(t);
      continue;
    }
    const next = tokens[i + 1] ?? "";
    const isName = IDENTIFIER.test(t) && /^[:=(<[{]/.test(next);
    if (isName || SAFE_VALUE.test(t)) {
      out.push(t);
      continue;
    }
    const gap = out.length > 1 && out[out.length - 1].trim() === "";
    if (gap && out[out.length - 2] === HIDDEN) out.pop();
    else out.push(HIDDEN);
  }
  return out.join("");
}

/** A route or API word: lowercase letters and dashes, nothing typed. */
const ROUTE_WORD = /^[a-z]+(?:[-_][a-z]+)*$/;

/**
 * A URL's path for the report: route words stay, every other segment (ids,
 * share tokens, names) becomes a stand-in, query values are hidden and the
 * host and fragment are dropped. A URL to another site keeps nothing but
 * that it was one.
 */
export function scrubUrl(url: string, ids: Pseudonyms): string {
  let parsed: URL;
  try {
    parsed = new URL(url, location.href);
  } catch {
    return HIDDEN;
  }
  if (parsed.origin !== location.origin) return "(other site)";
  const path = parsed.pathname
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (ROUTE_WORD.test(segment) && segment.length <= 24) return segment;
      return `:${ids.of(safeDecode(segment))}`;
    })
    .join("/");
  const keys = [...new Set(parsed.searchParams.keys())].filter((k) =>
    /^[a-z][a-zA-Z_-]{0,30}$/.test(k),
  );
  return keys.length
    ? `${path}?${keys.map((k) => `${k}=${HIDDEN}`).join("&")}`
    : path;
}

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Errors whose messages come from the browser, not from the app's data. */
const ENGINE_ERRORS = new Set([
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AbortError",
  "NotAllowedError",
  "NotFoundError",
  "NotSupportedError",
  "QuotaExceededError",
  "InvalidStateError",
  "SecurityError",
  "TimeoutError",
  "NetworkError",
  "DataError",
  "ChunkLoadError",
]);

const QUOTED = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL_IN_TEXT = /\b(?:https?|blob|data|file):[^\s'"`)]+/g;
const LONG_NUMBER = /\d{5,}/g;

/**
 * An engine's message with what it quotes (property names, but also the
 * text it failed to parse), addresses, links and long numbers hidden.
 */
function engineMessage(message: string, ids: Pseudonyms) {
  return ids
    .replaceIn(message)
    .replace(URL_IN_TEXT, HIDDEN)
    .replace(EMAIL, HIDDEN)
    .replace(QUOTED, HIDDEN)
    .replace(LONG_NUMBER, HIDDEN);
}

const STACK_FRAME =
  /^\s*(?:at\s+)?(?:(.*?)\s*\(|(.*?)@)?((?:https?|blob|webpack|file|chrome-extension|moz-extension):\/\/[^\s)]*?|\/[^\s)]*?)(?::(\d+))?(?::(\d+))?\)?\s*$/;

/**
 * A stack's frames as `function path:line:column`, the path without its
 * host: code, not data. At most `max` frames.
 */
export function scrubStack(stack: string, max = 12): string[] {
  const frames: string[] = [];
  for (const line of stack.split("\n")) {
    const m = STACK_FRAME.exec(line);
    if (!m) continue;
    const fn = (m[1] ?? m[2] ?? "").replace(/^async\s+/, "").trim();
    let path = m[3];
    try {
      const u = new URL(path, location.href);
      path = u.origin === location.origin ? u.pathname : "(other site)";
    } catch {
      path = HIDDEN;
    }
    const name = /^[\w$.<>[\]/ ]{1,80}$/.test(fn) ? fn : fn ? HIDDEN : "";
    const at = [path, m[4], m[5]].filter(Boolean).join(":");
    frames.push(name ? `${name} ${at}` : at);
    if (frames.length >= max) break;
  }
  return frames;
}

export interface ScrubbedError {
  name: string;
  message: string;
  stack?: string[];
}

/** An error for the report: its kind, a message kept to its shape, code. */
export function scrubError(error: unknown, ids: Pseudonyms): ScrubbedError {
  if (error instanceof Error || isErrorLike(error)) {
    const e = error as Error;
    const name = IDENTIFIER.test(e.name ?? "") ? e.name : "Error";
    const message = ENGINE_ERRORS.has(name)
      ? engineMessage(String(e.message ?? ""), ids)
      : keepShape(String(e.message ?? ""), ids);
    const stack = e.stack ? scrubStack(e.stack) : [];
    return {
      name,
      message: truncate(message),
      ...(stack.length ? { stack } : {}),
    };
  }
  return { name: "NonError", message: truncate(describeValue(error, ids)) };
}

function isErrorLike(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "message" in value
  );
}

/**
 * Any value as a short line of its shape: field names, flags and small
 * numbers stay; strings are `***` (ids their stand-ins); lists say how long
 * they are and show their first item.
 */
export function describeValue(
  value: unknown,
  ids: Pseudonyms,
  depth = 0,
): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number")
    return SAFE_VALUE.test(String(value)) ? String(value) : HIDDEN;
  if (typeof value === "string")
    return UUID.test(value) ? ids.of(value) : HIDDEN;
  if (typeof value === "bigint" || typeof value === "symbol") return HIDDEN;
  if (typeof value === "function") return "Function";
  if (value instanceof Error) {
    const e = scrubError(value, ids);
    return `${e.name}(${e.message})`;
  }
  if (depth >= 2) return Array.isArray(value) ? "Array(…)" : "Object(…)";
  if (Array.isArray(value)) {
    const first = value.length
      ? `, first: ${describeValue(value[0], ids, depth + 1)}`
      : "";
    return `Array(length: ${value.length}${first})`;
  }
  if (typeof value === "object") {
    const ctor = (value as object).constructor?.name;
    const type = ctor && IDENTIFIER.test(ctor) ? ctor : "Object";
    const fields = Object.entries(value as Record<string, unknown>)
      .slice(0, 12)
      .map(([k, v]) =>
        IDENTIFIER.test(k)
          ? `${k}: ${SENSITIVE_FIELD.test(k) ? HIDDEN : describeValue(v, ids, depth + 1)}`
          : HIDDEN,
      );
    return `${type}(${fields.join(", ")})`;
  }
  return HIDDEN;
}

/** Fields whose values never show, not even their shape. */
const SENSITIVE_FIELD =
  /password|token|secret|email|authorization|cookie|pin|key|name|title|content|text|body|url|query|search/i;

/**
 * A react-query key: its first item, the query's name, when that is a code
 * word; everything after it by shape only.
 */
export function describeQueryKey(key: readonly unknown[], ids: Pseudonyms) {
  return key.map((part, i) =>
    i === 0 && typeof part === "string" && /^[\w-]{1,40}$/.test(part)
      ? part
      : describeValue(part, ids, 1),
  );
}

/**
 * A key press for the report, when it can't spell what was typed: named
 * keys (Enter, Escape, arrows…) and shortcuts with Ctrl, Alt or ⌘. Plain
 * characters, with or without Shift, are never noted.
 */
export function describeKey(e: {
  key: string;
  code?: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): string | null {
  const shortcut = e.ctrlKey || e.altKey || e.metaKey;
  const named = e.key.length > 1 && /^[A-Z][A-Za-z0-9]*$/.test(e.key);
  if (!named && !shortcut) return null;
  if (["Control", "Alt", "Meta", "Shift", "AltGraph"].includes(e.key))
    return null;
  // With a modifier, the physical key: what a layout types there is moot.
  const key = named
    ? e.key
    : /^Key[A-Z]$|^Digit\d$/.test(e.code ?? "")
      ? (e.code as string).slice(-1).toLowerCase()
      : HIDDEN;
  // Dead keys and IME composition say nothing useful and might say a lot.
  if (key === "Dead" || key === "Process" || key === "Unidentified")
    return null;
  const mods = [
    e.ctrlKey && "ctrl",
    e.shiftKey && "shift",
    e.altKey && "alt",
    e.metaKey && "meta",
  ].filter(Boolean);
  return [...mods, key].join("+");
}

const MAX_CHARS = 300;

export const truncate = (value: string) =>
  value.length <= MAX_CHARS ? value : `${value.slice(0, MAX_CHARS)}…`;
