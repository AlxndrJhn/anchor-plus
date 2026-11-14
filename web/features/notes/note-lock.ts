import { create } from "zustand";
import { translate } from "@/lib/i18n";
import type { Note, NoteLockKind, NoteLockSecrets } from "./types";

/** A lock choice whose texts follow the language on screen. */
function lockKind(kind: NoteLockKind) {
  return {
    kind,
    get label() {
      return translate("noteHooks.noteLock")(`kinds.${kind}.label`);
    },
    get description() {
      return translate("noteHooks.noteLock")(`kinds.${kind}.description`);
    },
  };
}

/** The lock choices, in the order they are offered, the default first. */
export const LOCK_KINDS: readonly {
  kind: NoteLockKind;
  label: string;
  description: string;
}[] = [
  lockKind("biometric"),
  lockKind("pin"),
  lockKind("pattern"),
  lockKind("tap"),
];

export const lockLabel = (kind: NoteLockKind) =>
  LOCK_KINDS.find((k) => k.kind === kind)?.label ?? kind;

interface UnlockedNotesState {
  /** Locked notes opened since the session began. */
  ids: ReadonlySet<string>;
  unlock: (...ids: string[]) => void;
  /** Ends the session: every locked note locks again. */
  endSession: () => void;
}

/**
 * The notes unlocked this session. It lives in memory only, so a reload or
 * a closed tab ends it; so do signing out and the desktop app's screen lock.
 */
export const useUnlockedNotes = create<UnlockedNotesState>()((set) => ({
  ids: new Set(),
  unlock: (...ids) =>
    set((s) =>
      ids.every((id) => s.ids.has(id))
        ? s
        : { ids: new Set([...s.ids, ...ids]) },
    ),
  endSession: () => set((s) => (s.ids.size ? { ids: new Set() } : s)),
}));

/** Whether the note shows as locked: locked, and not opened this session. */
export const isLockHidden = (
  note: Pick<Note, "id" | "lock">,
  unlocked: ReadonlySet<string>,
) => !!note.lock && !unlocked.has(note.id);

/** Locking a selection leaves out the notes still locked this session. */
export function lockableNotes<T extends Pick<Note, "id" | "lock">>(
  notes: T[],
  unlocked: ReadonlySet<string>,
): { lockable: T[]; skipped: T[] } {
  const lockable: T[] = [];
  const skipped: T[] = [];
  for (const note of notes)
    (isLockHidden(note, unlocked) ? skipped : lockable).push(note);
  return { lockable, skipped };
}

/** What a locked note asks for on the web. */
export type UnlockMethod = "tap" | "pin" | "pattern" | "password";

/**
 * Browsers have no fingerprint check to rely on, so a fingerprint lock takes
 * the account password; without one (single sign-on), the PIN, the pattern,
 * or else a tap. A PIN or pattern that was never set falls back the same way.
 */
export function unlockMethod(
  kind: NoteLockKind,
  secrets: NoteLockSecrets | undefined,
): UnlockMethod {
  if (kind === "tap") return "tap";
  if (kind === "pin" && (!secrets || secrets.pin)) return "pin";
  if (kind === "pattern" && (!secrets || secrets.pattern)) return "pattern";
  if (!secrets || secrets.hasPassword) return "password";
  if (secrets.pin) return "pin";
  if (secrets.pattern) return "pattern";
  return "tap";
}

export const PIN_RULE = /^\d{4,12}$/;
export const PIN_HINT = "4 to 12 digits.";
/** PIN_HINT in the language on screen. */
export const pinHint = () => translate("noteHooks.noteLock")("pinHint");
export const PATTERN_MIN_DOTS = 4;

export const isValidPin = (pin: string) => PIN_RULE.test(pin);
export const isValidPattern = (pattern: string) =>
  /^(?!.*(.).*\1)[0-8]{4,9}$/.test(pattern);

/**
 * Adds `dot` (0 to 8, left to right, top to bottom) to a pattern being
 * drawn. As on Android, a line straight over an unused dot takes it too;
 * a dot already used is passed over.
 */
export function addPatternDot(path: number[], dot: number): number[] {
  if (dot < 0 || dot > 8 || path.includes(dot)) return path;
  const last = path[path.length - 1];
  if (last === undefined) return [dot];
  const [r1, c1] = [Math.floor(last / 3), last % 3];
  const [r2, c2] = [Math.floor(dot / 3), dot % 3];
  const between =
    (r1 + r2) % 2 === 0 && (c1 + c2) % 2 === 0
      ? ((r1 + r2) / 2) * 3 + (c1 + c2) / 2
      : null;
  return between !== null && !path.includes(between)
    ? [...path, between, dot]
    : [...path, dot];
}

/** The pattern grid's own units: three cells of 100, a dot in each middle. */
export const PATTERN_GRID_SIZE = 300;
const CELL = PATTERN_GRID_SIZE / 3;
const HIT_RADIUS = 38;

export const patternDotCentre = (dot: number) => ({
  x: (dot % 3) * CELL + CELL / 2,
  y: Math.floor(dot / 3) * CELL + CELL / 2,
});

/** The dot under a point in grid units, if it is near enough to one. */
export function patternDotAt(x: number, y: number): number | null {
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  if (col < 0 || col > 2 || row < 0 || row > 2) return null;
  const dot = row * 3 + col;
  const c = patternDotCentre(dot);
  return Math.hypot(x - c.x, y - c.y) <= HIT_RADIUS ? dot : null;
}

const fromBase64 = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/**
 * Checks a PIN or pattern against its stored hash,
 * "pbkdf2-sha256$iterations$salt$hash" (base64), here on the device.
 * Null when this browser can't (no Web Crypto outside a secure context).
 */
export async function lockSecretMatches(
  secret: string,
  stored: string,
): Promise<boolean | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2-sha256" || !salt || !hash) return false;
  const expected = fromBase64(hash);
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = new Uint8Array(
    await subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: fromBase64(salt),
        iterations: Number(iterations),
      },
      key,
      expected.length * 8,
    ),
  );
  let diff = bits.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}
