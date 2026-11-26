import { translate } from "@/lib/i18n";
import { COMMAND_IDS, COMMANDS, CONTEXT_KEYS, commandById } from "./commands";
import { normalizeChord } from "./keys";
import type { KeybindingRule } from "./store";
import { parseWhen, type When, whenKeys } from "./when";

export type Source = "default" | "user";

/** Why a rule can't be read, in the language on screen. */
const problem = () => translate("keybindings.errors");

/** A rule in force: its key written one way, its when clause read. */
export interface ActiveRule {
  key: string;
  command: string;
  when?: string;
  source: Source;
  /** Its place in the user's list, for a user rule. */
  index?: number;
  test: When;
  first: boolean;
}

export const DEFAULT_RULES: KeybindingRule[] = COMMANDS.flatMap((c) =>
  c.keys.map((k) => ({
    key: k.key,
    command: c.id,
    ...("when" in k ? { when: k.when } : {}),
  })),
);

const sameWhen = (a?: string, b?: string) =>
  (a ?? "").replace(/\s+/g, "") === (b ?? "").replace(/\s+/g, "");

function tryChord(key: string, mac: boolean): string | null {
  try {
    return normalizeChord(key, mac);
  } catch {
    return null;
  }
}

function tryWhen(when: string | undefined): When | null {
  try {
    return parseWhen(when);
  } catch {
    return null;
  }
}

/**
 * The defaults, less those the user took away, then the user's own rules;
 * a rule that can't be read is left out (validateRules says why).
 */
export function activeRules(
  user: KeybindingRule[],
  mac: boolean,
): ActiveRule[] {
  let rules: ActiveRule[] = [];
  const add = (rule: KeybindingRule, source: Source, index?: number) => {
    const key = tryChord(rule.key, mac);
    const test = tryWhen(rule.when);
    if (!key || !test) return;
    rules.push({
      key,
      command: rule.command,
      when: rule.when,
      source,
      index,
      test,
      first: !!commandById(rule.command)?.first,
    });
  };
  for (const rule of DEFAULT_RULES) add(rule, "default");
  user.forEach((rule, index) => {
    if (typeof rule?.command !== "string") return;
    if (rule.command.startsWith("-")) {
      const command = rule.command.slice(1);
      const key = rule.key ? tryChord(rule.key, mac) : null;
      rules = rules.filter(
        (r) =>
          !(
            r.command === command &&
            (!rule.key || r.key === key) &&
            (rule.when === undefined || sameWhen(r.when, rule.when))
          ),
      );
      return;
    }
    if (typeof rule.key === "string") add(rule, "user", index);
  });
  return rules;
}

export interface RuleProblem {
  index: number;
  message: string;
}

/** What is wrong with each of the user's rules, for the JSON view. */
export function validateRules(value: unknown, mac: boolean): RuleProblem[] {
  if (!Array.isArray(value))
    return [
      {
        index: -1,
        message: problem()("mustBeList", { shape: "[ { … }, … ]" }),
      },
    ];
  const problems: RuleProblem[] = [];
  value.forEach((rule, index) => {
    const say = (message: string) => problems.push({ index, message });
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      say(problem()("mustBeRule", { shape: '{ "key": …, "command": … }' }));
      return;
    }
    const { key, command, when } = rule as Record<string, unknown>;
    if (typeof command !== "string" || !command) {
      say(problem()("needsCommand"));
      return;
    }
    const id = command.replace(/^-/, "");
    if (!COMMAND_IDS.has(id)) say(problem()("noCommand", { id }));
    if (key === undefined) {
      if (!command.startsWith("-")) say(problem()("needsKey"));
    } else if (typeof key !== "string") say(problem()("keyNotText"));
    else {
      try {
        normalizeChord(key, mac);
      } catch (e) {
        say(problem()("inKey", { key, problem: (e as Error).message }));
      }
    }
    if (when !== undefined) {
      if (typeof when !== "string") say(problem()("whenNotText"));
      else {
        try {
          parseWhen(when);
          const unknown = whenKeys(when).filter(
            (k) => !(CONTEXT_KEYS as readonly string[]).includes(k),
          );
          if (unknown.length)
            say(problem()("unknownContext", { key: unknown[0] }));
        } catch (e) {
          say(problem()("inWhen", { problem: (e as Error).message }));
        }
      }
    }
  });
  return problems;
}

/** Strips // and /* *\/ comments and trailing commas, as VS Code allows. */
export function parseJsonc(text: string): unknown {
  let out = "";
  let i = 0;
  let inString = false;
  while (i < text.length) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") {
        out += text[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      i++;
    } else if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
    } else {
      out += c;
      i++;
    }
  }
  return JSON.parse(out.replace(/,(\s*[\]}])/g, "$1"));
}

/** keybindings.json as VS Code writes it: one rule a line. */
export function rulesToJson(rules: KeybindingRule[]): string {
  if (!rules.length) return "[]";
  const lines = rules.map((rule) => {
    const parts = [
      `"key": ${JSON.stringify(rule.key)}`,
      `"command": ${JSON.stringify(rule.command)}`,
      ...(rule.when !== undefined
        ? [`"when": ${JSON.stringify(rule.when)}`]
        : []),
    ];
    return `  { ${parts.join(", ")} }`;
  });
  return `[\n${lines.join(",\n")}\n]`;
}

/**
 * Other commands with the same key and the same when clause: one always
 * hides the other. (The same key in other contexts is how defaults share
 * keys, such as F on a card and in a note.)
 */
export function conflictsOf(
  rule: { key: string; command: string; when?: string },
  rules: ActiveRule[],
): ActiveRule[] {
  return rules.filter(
    (r) =>
      r.key === rule.key &&
      r.command !== rule.command &&
      sameWhen(r.when, rule.when),
  );
}
