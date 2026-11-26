// Plays a feature demo on the real app: a pointer moves to each control and
// clicks it, and text is typed in, through the same DOM events a person's
// clicks and keys send.

import type { MessageKeys, NestedKeyOf } from "next-intl";
import { type Messages, translate } from "@/lib/i18n";

/**
 * Text to look for on screen: as written, or looked up when the step plays,
 * so that it is in the language on screen (see `ui`).
 */
export type Text = string | (() => string);

type UiKey = MessageKeys<Messages, NestedKeyOf<Messages>>;

/**
 * A message of the app's own, in the language on screen when the step plays:
 * ui("common.back"), ui("notes.noteCard.selectNote", { label: "Groceries" }).
 */
export const ui =
  (key: UiKey, values?: Record<string, string>): (() => string) =>
  () =>
    translate()(key, values);

function resolve(text: Text): string;
function resolve(text: Text | undefined): string | undefined;
function resolve(text: Text | undefined) {
  return typeof text === "function" ? text() : text;
}

/** A control on screen: its accessible name, its text, or a selector. */
export type Target =
  | Text
  | {
      label?: Text;
      text?: Text;
      /** The control's text starts with this. */
      textStarts?: Text;
      css?: Text;
      /** Also when not shown yet, e.g. until its row is hovered. */
      hidden?: boolean;
      /** Only inside the element this selector finds. */
      within?: Text;
      /** Which one, when several match; the first by default. */
      nth?: number;
    };

/**
 * How a step copes with the phone layout, where some controls sit behind
 * another one (search behind Search, tags behind Open menu, actions in More)
 * or aren't there at all.
 */
export interface Fallback {
  /** Skipped when the target isn't on screen, e.g. a phone's Open menu. */
  ifShown?: boolean;
  /** Pressed in turn first when the target isn't on screen. */
  reveal?: Target[];
  /** Played instead when the target isn't on screen, even after `reveal`. */
  orElse?: Step;
}

export type Step =
  /**
   * Shows a caption. Each `say` is a key: the words are the demo's
   * items.<slug>.say.<key> in messages/<locale>/demos.json.
   */
  | { say: string }
  | ({ click: Target; say?: string } & Fallback)
  | ({ hover: Target; say?: string } & Fallback)
  /** Types into the target, or where the caret is. */
  | ({ type: string; into?: Target; say?: string } & Fallback)
  | { key: string; code?: string; shift?: boolean; ctrl?: boolean }
  | { go: string; say?: string }
  | { wait: number }
  | { waitFor: Target; timeout?: number }
  /** Anything else the app needs, e.g. a drag. */
  | { run: (play: Play) => Promise<void> | void; say?: string };

export interface Play {
  /** Throws once the demo is stopped. */
  check: () => void;
  find: (target: Target, timeout?: number) => Promise<HTMLElement>;
  moveTo: (element: Element) => Promise<void>;
  pause: (ms: number) => Promise<void>;
  say: (text: string) => void;
  go: (path: string) => void;
  cursor: (x: number, y: number, pressed?: boolean) => void;
}

export class Stopped extends Error {}

const CONTROLS =
  "button, a, input, textarea, select, label, summary, [role=button], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=option], [role=tab], [role=switch], [role=checkbox], [role=radio], [contenteditable=true], [aria-label]";

const normalize = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim();

function isShown(element: Element) {
  if (element.closest("[data-demo-player]")) return false;
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none";
}

/** Takes up room on the page, though maybe not visible (shown on hover). */
function isLaidOut(element: Element) {
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

function matches(target: Target): HTMLElement[] {
  const plain = typeof target !== "object";
  const given = plain ? { label: target } : target;
  const spec = {
    ...given,
    label: resolve(given.label),
    text: resolve(given.text),
    textStarts: resolve(given.textStarts),
    css: resolve(given.css),
    within: resolve(given.within),
  };
  const roots = spec.within
    ? Array.from(document.querySelectorAll(spec.within))
    : [document];
  const found: HTMLElement[] = [];
  for (const root of roots) {
    const candidates = Array.from(
      root.querySelectorAll<HTMLElement>(spec.css ?? CONTROLS),
    );
    for (const element of candidates) {
      if (
        spec.hidden ? element.closest("[data-demo-player]") : !isShown(element)
      )
        continue;
      if (spec.label !== undefined) {
        const label =
          element.getAttribute("aria-label") ?? element.getAttribute("title");
        if (normalize(label) !== spec.label) {
          // A plain string also matches a control's own text.
          if (!plain) continue;
          if (normalize(element.textContent) !== spec.label) continue;
        }
      }
      if (
        spec.text !== undefined &&
        normalize(element.textContent) !== spec.text
      )
        continue;
      if (
        spec.textStarts !== undefined &&
        !normalize(element.textContent).startsWith(spec.textStarts)
      )
        continue;
      found.push(element);
    }
  }
  // A hidden one in this layout before one left out of it, e.g. the desktop
  // sidebar's on a phone.
  if (spec.hidden && found.some(isLaidOut))
    found.splice(0, found.length, ...found.filter(isLaidOut));
  // The innermost control that matches, not the ones around it.
  return found.filter(
    (element) =>
      !found.some((other) => other !== element && element.contains(other)),
  );
}

export function describe(target: Target) {
  if (typeof target !== "object") return resolve(target);
  return JSON.stringify(target, (_, value) =>
    typeof value === "function" ? value() : value,
  );
}

export async function findTarget(
  target: Target,
  check: () => void,
  timeout = 6000,
): Promise<HTMLElement> {
  const until = Date.now() + timeout;
  const nth = typeof target === "object" ? (target.nth ?? 0) : 0;
  for (;;) {
    check();
    const element = matches(target)[nth];
    if (element) return element;
    if (Date.now() > until) throw new Error(`Not found: ${describe(target)}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export function center(element: Element) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** The events a mouse click sends, in order. */
export function clickElement(element: HTMLElement) {
  const { x, y } = center(element);
  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    button: 0,
    view: window,
  };
  const pointer = {
    ...init,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
  };
  element.dispatchEvent(new PointerEvent("pointerover", pointer));
  element.dispatchEvent(new PointerEvent("pointerenter", pointer));
  element.dispatchEvent(new MouseEvent("mouseover", init));
  // As in a browser: a pointerdown that is prevented sends no mouse events,
  // and a press focuses what it lands on unless prevented.
  const mouse = element.dispatchEvent(
    new PointerEvent("pointerdown", { ...pointer, buttons: 1 }),
  );
  const focuses =
    mouse &&
    element.dispatchEvent(new MouseEvent("mousedown", { ...init, buttons: 1 }));
  const focusable = element.closest<HTMLElement>(
    "input, textarea, select, button, a[href], [tabindex], [contenteditable=true]",
  );
  if (focuses && focusable) focusable.focus({ preventScroll: true });
  element.dispatchEvent(new PointerEvent("pointerup", pointer));
  if (mouse) element.dispatchEvent(new MouseEvent("mouseup", init));
  element.dispatchEvent(new MouseEvent("click", init));
}

export function hoverElement(element: HTMLElement) {
  const { x, y } = center(element);
  const init = { bubbles: true, clientX: x, clientY: y, view: window };
  element.dispatchEvent(
    new PointerEvent("pointerover", { ...init, pointerType: "mouse" }),
  );
  element.dispatchEvent(
    new PointerEvent("pointermove", { ...init, pointerType: "mouse" }),
  );
  element.dispatchEvent(new MouseEvent("mouseover", init));
  element.dispatchEvent(new MouseEvent("mousemove", init));
}

/** The events a mouse sends when it leaves an element. */
export function leaveElement(element: Element) {
  if (!element.isConnected) return;
  const init = { bubbles: true, view: window };
  const pointer = { ...init, pointerId: 1, pointerType: "mouse" };
  element.dispatchEvent(new PointerEvent("pointerout", pointer));
  element.dispatchEvent(
    new PointerEvent("pointerleave", { ...pointer, bubbles: false }),
  );
  element.dispatchEvent(new MouseEvent("mouseout", init));
  element.dispatchEvent(
    new MouseEvent("mouseleave", { ...init, bubbles: false }),
  );
}

export function pressKey(
  key: string,
  {
    code,
    shift = false,
    ctrl = false,
  }: { code?: string; shift?: boolean; ctrl?: boolean } = {},
) {
  const target =
    (document.activeElement as HTMLElement | null) ?? document.body;
  const init = {
    key,
    code: code ?? (/^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key),
    bubbles: true,
    cancelable: true,
    shiftKey: shift,
    ctrlKey: ctrl,
  };
  const down = new KeyboardEvent("keydown", init);
  const handled = !target.dispatchEvent(down);
  target.dispatchEvent(new KeyboardEvent("keyup", init));
  return handled;
}

/** Types one character where the caret is, as a key press would. */
export function typeCharacter(character: string) {
  const element = document.activeElement as HTMLElement | null;
  if (!element) return;
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    const proto =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setValue = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const value =
      element.value.slice(0, start) + character + element.value.slice(end);
    setValue?.call(element, value);
    element.setSelectionRange?.(start + 1, start + 1);
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: character,
        inputType: "insertText",
      }),
    );
    return;
  }
  if (character === "\n") {
    pressKey("Enter");
    return;
  }
  document.execCommand("insertText", false, character);
}

/** Puts the caret at the end of an editable element. */
export function caretToEnd(element: HTMLElement) {
  element.focus();
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.setSelectionRange(element.value.length, element.value.length);
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Selects the first occurrence of `text` in the note's text, as a drag would. */
export function selectInEditor(text: string): Element | null {
  const editor = document.querySelector<HTMLElement>(".ql-editor");
  if (!editor) return null;
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const at = node.textContent?.indexOf(text) ?? -1;
    if (at < 0) continue;
    editor.focus();
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + text.length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    return node.parentElement;
  }
  return null;
}

/** Drags with the mouse from one element to another, in small moves. */
export async function dragBetween(from: Element, to: Element, play: Play) {
  const start = center(from);
  const end = center(to);
  const pointer = {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    view: window,
  };
  await play.moveTo(from);
  play.cursor(start.x, start.y, true);
  from.dispatchEvent(
    new PointerEvent("pointerdown", {
      ...pointer,
      buttons: 1,
      clientX: start.x,
      clientY: start.y,
    }),
  );
  const steps = 30;
  for (let i = 1; i <= steps; i++) {
    const x = start.x + ((end.x - start.x) * i) / steps;
    const y = start.y + ((end.y - start.y) * i) / steps;
    play.cursor(x, y, true);
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        ...pointer,
        buttons: 1,
        clientX: x,
        clientY: y,
      }),
    );
    await play.pause(45);
  }
  await play.pause(600);
  window.dispatchEvent(
    new PointerEvent("pointerup", {
      ...pointer,
      clientX: end.x,
      clientY: end.y,
    }),
  );
  play.cursor(end.x, end.y, false);
}
