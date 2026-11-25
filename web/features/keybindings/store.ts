import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Shortcut } from "@/features/notes/date-stamp";
import { usePreferencesStore } from "@/features/preferences";
import { keyOfCode } from "./keys";

/**
 * One line of keybindings.json, as in VS Code. A command starting with "-"
 * takes away the default keys of that command (only those with this key,
 * and this when clause, if given).
 */
export interface KeybindingRule {
  key: string;
  command: string;
  when?: string;
}

interface KeybindingsState {
  /** The user's rules, after the defaults; the later of two wins. */
  rules: KeybindingRule[];
  setRules: (rules: KeybindingRule[]) => void;
}

export const useKeybindingsStore = create<KeybindingsState>()(
  persist(
    (set) => ({
      rules: [],
      setRules: (rules) => set({ rules }),
    }),
    { name: "keybindings", version: 1 },
  ),
);

/** A date shortcut recorded in Settings before keybindings, as a key. */
export function legacyShortcutKey(shortcut: Shortcut): string | null {
  const key = keyOfCode(shortcut.code);
  if (!key) return null;
  return [
    shortcut.ctrl && "ctrl",
    shortcut.shift && "shift",
    shortcut.alt && "alt",
    shortcut.meta && "meta",
    key,
  ]
    .filter(Boolean)
    .join("+");
}

const LEGACY = [
  ["dateShortcut", "editor.insertDate", "ctrl+;"],
  ["dateTimeShortcut", "editor.insertDateTime", "ctrl+shift+;"],
] as const;

/** The rules that keep date shortcuts changed in Settings before keybindings. */
export function legacyDateRules(editor: {
  dateShortcut?: Shortcut;
  dateTimeShortcut?: Shortcut;
}): KeybindingRule[] {
  return LEGACY.flatMap(([pref, command, defaultKey]) => {
    const shortcut = editor[pref];
    const key = shortcut && legacyShortcutKey(shortcut);
    if (!key || key === defaultKey) return [];
    return [
      { key: defaultKey, command: `-${command}` },
      { key, command, when: "editorFocus" },
    ];
  });
}

/** Moves the date shortcuts out of preferences, once, on this device. */
function moveLegacyDateShortcuts() {
  const prefs = usePreferencesStore.getState();
  const { dateShortcut, dateTimeShortcut } = prefs.editor;
  if (!dateShortcut && !dateTimeShortcut) return;
  const moved = legacyDateRules({ dateShortcut, dateTimeShortcut });
  const { rules, setRules } = useKeybindingsStore.getState();
  if (moved.length) setRules([...rules, ...moved]);
  prefs.setEditorPreference("dateShortcut", undefined);
  prefs.setEditorPreference("dateTimeShortcut", undefined);
}

if (typeof window !== "undefined") moveLegacyDateShortcuts();
