import type { ActiveRule } from "./rules";
import type { KeybindingRule } from "./store";

/**
 * Changes the Keyboard shortcuts page makes to the user's rules, written as
 * VS Code writes them: a default is never edited, only taken away ("-"
 * command) and replaced.
 */

type Row = Pick<ActiveRule, "key" | "command" | "when" | "source" | "index">;

const removal = (row: Row): KeybindingRule => ({
  key: row.key,
  command: `-${row.command}`,
  ...(row.when !== undefined ? { when: row.when } : {}),
});

const rule = (key: string, command: string, when?: string): KeybindingRule => ({
  key,
  command,
  ...(when?.trim() ? { when: when.trim() } : {}),
});

/** The row's key, and its when clause, set anew. */
export function replaceRule(
  user: KeybindingRule[],
  row: Row,
  key: string,
  when: string | undefined,
): KeybindingRule[] {
  if (row.source === "user" && row.index !== undefined)
    return user.map((r, i) =>
      i === row.index ? rule(key, r.command, when) : r,
    );
  return [...user, removal(row), rule(key, row.command, when)];
}

export function addRule(
  user: KeybindingRule[],
  command: string,
  key: string,
  when?: string,
): KeybindingRule[] {
  return [...user, rule(key, command, when)];
}

export function removeRule(user: KeybindingRule[], row: Row): KeybindingRule[] {
  if (row.source === "user" && row.index !== undefined)
    return user.filter((_, i) => i !== row.index);
  return [...user, removal(row)];
}

/** The command's keys back to the defaults. */
export function resetCommand(
  user: KeybindingRule[],
  command: string,
): KeybindingRule[] {
  return user.filter(
    (r) => r.command !== command && r.command !== `-${command}`,
  );
}

export const isChanged = (user: KeybindingRule[], command: string) =>
  user.some((r) => r.command === command || r.command === `-${command}`);
