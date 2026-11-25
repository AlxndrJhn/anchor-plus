"use client";

import * as React from "react";
import { usePreferencesStore } from "@/features/preferences";
import { isMac } from "@/lib/platform";
import type { CommandId } from "./commands";
import { chordAria, chordText, isSingleCharacter, parseStroke } from "./keys";
import { activeRules } from "./rules";
import { useKeybindingsStore } from "./store";

/**
 * The keys that run a command now, defaults first, for tooltips and the
 * shortcuts dialog; redraws when the user changes them.
 */
export function useKeysFor(): (command: CommandId) => string[] {
  const user = useKeybindingsStore((s) => s.rules);
  const rules = React.useMemo(() => activeRules(user, isMac()), [user]);
  return React.useCallback(
    (command: CommandId) => [
      ...new Set(rules.filter((r) => r.command === command).map((r) => r.key)),
    ],
    [rules],
  );
}

/**
 * The first key that runs a command now, to show beside its button: as it
 * reads, and for aria-keyshortcuts. None for a command with no key, or only
 * single characters while those are off.
 */
export function useKeyHint(
  command: CommandId,
): { text: string; aria: string } | null {
  const keysFor = useKeysFor();
  const singleKeys = usePreferencesStore(
    (s) => s.editor.singleKeyShortcuts !== false,
  );
  const mac = isMac();
  const key = keysFor(command).find(
    (k) =>
      singleKeys ||
      !k.split(" ").some((s) => isSingleCharacter(parseStroke(s, mac))),
  );
  return key ? { text: chordText(key, mac), aria: chordAria(key, mac) } : null;
}
