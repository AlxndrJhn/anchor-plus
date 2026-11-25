"use client";

import * as React from "react";
import { usePreferencesStore } from "@/features/preferences";
import { hasOverlay, isTypingTarget } from "@/lib/hooks/use-shortcuts";
import { isMac } from "@/lib/platform";
import { type CommandId, commandById } from "./commands";
import {
  hasCommandModifier,
  isFunctionKey,
  isSingleCharacter,
  parseStroke,
  type Stroke,
  strokeFromEvent,
  strokeToString,
} from "./keys";
import { type ActiveRule, activeRules } from "./rules";
import { useKeybindingsStore } from "./store";
import type { ContextValue } from "./when";

/**
 * Runs commands from key presses. Rules come from the defaults and the
 * user's keybindings.json; the last whose key was pressed, whose when
 * clause holds and whose command can run now, runs.
 *
 * Whatever the rules say, nothing runs under an open dialog or menu, a key
 * without Ctrl, Alt or ⌘ (or an F key) never acts from inside a text field,
 * and a character alone doesn't act with single-key shortcuts turned off.
 */

/** Runs a command; false when it couldn't, so a later rule may. */
type Handler = (e: KeyboardEvent) => unknown;

const handlers = new Map<string, Handler[]>();
const contextValues = new Map<string, { value: ContextValue }[]>();
const dynamicContext = new Map<
  string,
  (target: EventTarget | null) => ContextValue
>();

/** Rules in force, worked out again when the user's change. */
let rulesCache: { user: unknown; rules: ActiveRule[] } | null = null;
export function currentRules(): ActiveRule[] {
  const user = useKeybindingsStore.getState().rules;
  if (rulesCache?.user !== user)
    rulesCache = { user, rules: activeRules(user, isMac()) };
  return rulesCache.rules;
}

/** A second stroke must follow the first within this. */
const CHORD_WAIT = 1500;

let pending: { stroke: string; at: number } | null = null;
/** The key press being handled, read before anything else sees it. */
let press: {
  event: KeyboardEvent;
  stroke: Stroke;
  text: string;
  chord: string | null;
  overlay: boolean;
} | null = null;

function contextFor(
  target: EventTarget | null,
  extra?: Record<string, ContextValue>,
) {
  return (key: string): ContextValue => {
    if (extra && key in extra) return extra[key];
    const dynamic = dynamicContext.get(key);
    if (dynamic) return dynamic(target);
    switch (key) {
      case "inputFocus":
        return isTypingTarget(target);
      case "editorFocus":
        return (
          target instanceof HTMLElement &&
          !!target.closest(".ql-editor[contenteditable=true]")
        );
      case "cardFocus":
        return (
          target instanceof HTMLElement && target.classList.contains("nc-link")
        );
      case "isMac":
        return isMac();
    }
    const values = contextValues.get(key);
    return values?.length ? values[values.length - 1].value : undefined;
  };
}

/** Whether these strokes may act here at all, whatever the rules say. */
function mayAct(strokes: Stroke[], target: EventTarget | null) {
  const last = strokes[strokes.length - 1];
  if (
    isTypingTarget(target) &&
    !hasCommandModifier(last) &&
    !isFunctionKey(last)
  )
    return false;
  if (
    usePreferencesStore.getState().editor.singleKeyShortcuts === false &&
    strokes.some(isSingleCharacter)
  )
    return false;
  return true;
}

function snapshot(e: KeyboardEvent) {
  if (press?.event === e) return press;
  const stroke = strokeFromEvent(e);
  if (!stroke) return null;
  // A press nobody read first (in a test, say) has no chord before it.
  return {
    event: e,
    stroke,
    text: strokeToString(stroke),
    chord: null,
    overlay: hasOverlay(),
  };
}

/**
 * The commands a key press asks for, best first. A chord in force (both
 * strokes pressed, a command for it able to run) leaves out the commands of
 * its last stroke alone.
 */
function candidates(
  e: KeyboardEvent,
  canRun: (command: string) => boolean,
  extra?: Record<string, ContextValue>,
): string[] {
  const now = snapshot(e);
  if (!now) return [];
  const ctx = contextFor(e.target, extra);
  const mac = isMac();
  const matching = (key: string, strokes: Stroke[]) => {
    if (!mayAct(strokes, e.target)) return [];
    return currentRules()
      .filter((r) => r.key === key && canRun(r.command) && r.test(ctx))
      .reverse()
      .map((r) => r.command);
  };
  if (now.chord) {
    const strokes = now.chord.split(" ").map((s) => parseStroke(s, mac));
    const chord = matching(now.chord, strokes);
    if (chord.length) return chord;
  }
  return matching(now.text, [now.stroke]);
}

const hasHandler = (command: string) => !!handlers.get(command)?.length;

/**
 * For a component that handles keys on its own element (a focused card, the
 * note's text): which of `commands` this press asks for, if one; the
 * context also holds `extra`. A chord another command takes comes first.
 */
export function commandForKey<C extends CommandId>(
  e: KeyboardEvent,
  commands: readonly C[],
  extra?: Record<string, ContextValue>,
): C | null {
  if (e.isComposing) return null;
  const mine = new Set<string>(commands);
  const [best] = candidates(e, (c) => mine.has(c) || hasHandler(c), extra);
  return best && mine.has(best) ? (best as C) : null;
}

function run(e: KeyboardEvent, first: boolean) {
  const now = press?.event === e ? press : null;
  if (!now || now.overlay || e.defaultPrevented || e.isComposing) return;
  // Before the focused field, only commands that ask to be first, by keys
  // with Ctrl, Alt or ⌘.
  const firstOnly = (command: string) =>
    !first || (hasCommandModifier(now.stroke) && !!commandById(command)?.first);
  for (const command of candidates(e, (c) => hasHandler(c) && firstOnly(c))) {
    const stack = handlers.get(command);
    const handler = stack?.[stack.length - 1];
    if (handler && handler(e) !== false) {
      e.preventDefault();
      if (first) e.stopPropagation();
      return;
    }
  }
  // The first stroke of a chord: nothing else takes it.
  if (!first && pending?.stroke === now.text) e.preventDefault();
}

function onCapture(e: KeyboardEvent) {
  // A field that records keys (the shortcuts search) takes every press.
  if (e.target instanceof Element && e.target.closest("[data-records-keys]")) {
    press = null;
    pending = null;
    return;
  }
  const stroke = strokeFromEvent(e);
  if (!stroke) return;
  const text = strokeToString(stroke);
  const t = performance.now();
  const chord =
    pending && t - pending.at < CHORD_WAIT ? `${pending.stroke} ${text}` : null;
  press = { event: e, stroke, text, chord, overlay: hasOverlay() };
  // Wait for a second stroke if some chord in force starts with this one.
  const ctx = contextFor(e.target);
  pending =
    !chord &&
    mayAct([stroke], e.target) &&
    currentRules().some(
      (r) =>
        r.key.startsWith(`${text} `) && hasHandler(r.command) && r.test(ctx),
    )
      ? { stroke: text, at: t }
      : null;
  run(e, true);
}

let installed = 0;
const onBubble = (e: KeyboardEvent) => run(e, false);
function install() {
  if (installed++) return;
  window.addEventListener("keydown", onCapture, true);
  window.addEventListener("keydown", onBubble);
}
function uninstall() {
  if (--installed) return;
  window.removeEventListener("keydown", onCapture, true);
  window.removeEventListener("keydown", onBubble);
  pending = null;
}

/**
 * Lets a key run `command` while this is mounted and enabled; of two, the
 * later mounted runs it. Return false from the handler when it can't act,
 * and the next rule for the key gets its turn.
 */
export function useCommand(
  command: CommandId,
  handler: Handler,
  enabled = true,
) {
  const live = React.useRef(handler);
  live.current = handler;
  React.useEffect(() => {
    if (!enabled) return;
    const run: Handler = (e) => live.current(e);
    const stack = handlers.get(command) ?? [];
    stack.push(run);
    handlers.set(command, stack);
    install();
    return () => {
      stack.splice(stack.indexOf(run), 1);
      uninstall();
    };
  }, [command, enabled]);
}

/** Several commands at once, each `enabled` with the rest. */
export function useCommands(
  map: Partial<Record<CommandId, Handler>>,
  enabled = true,
) {
  const live = React.useRef(map);
  live.current = map;
  const ids = Object.keys(map).sort().join(" ");
  React.useEffect(() => {
    if (!enabled) return;
    const added = ids
      .split(" ")
      .filter(Boolean)
      .map((command) => {
        const run: Handler = (e) => {
          // Gone since the last draw: let another rule have the key.
          const handler = live.current[command as CommandId];
          return handler ? handler(e) : false;
        };
        const stack = handlers.get(command) ?? [];
        stack.push(run);
        handlers.set(command, stack);
        return [stack, run] as const;
      });
    install();
    return () => {
      for (const [stack, run] of added) stack.splice(stack.indexOf(run), 1);
      uninstall();
    };
  }, [ids, enabled]);
}

/** Sets a context key for when clauses while mounted; the latest wins. */
export function useContextKey(key: string, value: ContextValue) {
  const entry = React.useRef({ value });
  entry.current.value = value;
  React.useEffect(() => {
    const list = contextValues.get(key) ?? [];
    const mine = entry.current;
    list.push(mine);
    contextValues.set(key, list);
    return () => {
      list.splice(list.indexOf(mine), 1);
    };
  }, [key]);
}

/** A context key worked out from the focused element at each press. */
export function defineContextKey(
  key: string,
  read: (target: EventTarget | null) => ContextValue,
) {
  dynamicContext.set(key, read);
}

/** For tests: forget handlers, context and the stroke waiting for a chord. */
export function resetDispatcher() {
  handlers.clear();
  contextValues.clear();
  pending = null;
  press = null;
  rulesCache = null;
}
