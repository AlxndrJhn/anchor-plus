"use client";

import * as React from "react";
import { DURATION, EASE } from "@/lib/design/tokens";
import { prefersReducedMotion } from "@/lib/motion";

/** The order the cards would take if the dragged one were let go now. */
export interface DragPreview {
  draggedId: string;
  /** The group it was picked up from. */
  from: string;
  /** The group it would land in, and that group's order with it. */
  group: string;
  ids: string[];
  /**
   * Let go: the order stays shown until the list itself has it, so the cards
   * don't flash back to the old order in between.
   */
  settling?: boolean;
}

/** How long a let-go order is held if the list never takes it up. */
const SETTLE_TIMEOUT = 2000;

interface Pressed {
  draggedId: string;
  from: string;
  /** Each group's order when the press began. */
  startGroups: Record<string, string[]>;
  box: HTMLElement;
  x: number;
  y: number;
  pointerId: number;
  isTouch: boolean;
  /** Held long enough (or pressed by its grip, or with a mouse) to drag. */
  isHeld: boolean;
  holdTimer: number;
  ring: HTMLElement | null;
}

interface Dragging extends Pressed {
  ghost: HTMLElement;
  group: string;
  ids: string[];
  /** No new target until the cards have moved out of the way. */
  settledAt: number;
  pointerX: number;
  pointerY: number;
  scrollFrame: number;
}

const START_DISTANCE = 6;
/** A finger that moves this far before the hold is scrolling. */
const SCROLL_DISTANCE = 10;
/** How long a finger holds a card before it lifts. */
export const HOLD_MS = 250;
const EDGE = 64;
const MAX_SCROLL_STEP = 18;

/** Anything in a card that does its own thing on a press. */
const OWN_CONTROLS = "button, input, textarea, select, [role=checkbox]";
const GROUP = "[data-drag-group]";
const CARD = `${GROUP} > .nc`;

const cardOf = (id: string) =>
  document.querySelector<HTMLElement>(`${CARD}[data-flip="${CSS.escape(id)}"]`);

const moveTo = (ids: string[], id: string, index: number) => {
  const rest = ids.filter((x) => x !== id);
  rest.splice(index, 0, id);
  return rest;
};

type Remembered = React.RefObject<Map<string, DOMRect> | null>;

/** Where the cards are now, for the slide after the next render. */
function remember(into: Remembered) {
  const rects = new Map<string, DOMRect>();
  for (const card of document.querySelectorAll<HTMLElement>(CARD))
    if (card.dataset.flip)
      rects.set(card.dataset.flip, card.getBoundingClientRect());
  into.current = rects;
}

const sameOrder = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i]);

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    )
      return node;
  }
  return null;
}

/** The ring that grows under a finger holding a card. */
function showRing(x: number, y: number) {
  const ring = document.createElement("div");
  ring.className = "hold-ring";
  ring.setAttribute("aria-hidden", "true");
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.setProperty("--hold", `${HOLD_MS}ms`);
  document.body.append(ring);
  return ring;
}

/** The click that ends a press is not a click on the card. */
function swallowNextClick() {
  const swallow = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  window.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(
    () => window.removeEventListener("click", swallow, { capture: true }),
    0,
  );
}

/**
 * Drag to arrange, as in Google Keep: press a card and move, and it lifts
 * off and follows the pointer; the others make room where it would land, so
 * the new order shows before it is let go. It may land in another group
 * (into Pinned, or out of it). Esc puts everything back.
 *
 * With a mouse a press and move drags. A finger holds the card a moment
 * first (a ring grows under it), so a quick swipe still scrolls; held and
 * let go without moving, it calls [onHold]. A list row's grip drags at once.
 */
export function useCardDrag({
  enabled,
  onDrop,
  onHold,
}: {
  enabled: boolean;
  /** Let go at a new place; `ids` is the new order of the group `to`. */
  onDrop: (draggedId: string, from: string, to: string, ids: string[]) => void;
  /** A finger held a card and let go without moving it. */
  onHold?: (noteId: string) => void;
}) {
  const [preview, setPreview] = React.useState<DragPreview | null>(null);
  const pressed = React.useRef<Pressed | null>(null);
  const dragging = React.useRef<Dragging | null>(null);
  const rectsBefore = React.useRef<Map<string, DOMRect> | null>(null);
  const onDropRef = React.useRef(onDrop);
  onDropRef.current = onDrop;
  const onHoldRef = React.useRef(onHold);
  onHoldRef.current = onHold;

  // The dragged card's place shows as a gap wherever it is drawn now (a
  // card moved to another group is a new element), and the cards that moved
  // slide from where they were to where they are.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each preview is drawn
  React.useLayoutEffect(() => {
    const drag = dragging.current;
    if (drag) cardOf(drag.draggedId)?.setAttribute("data-dragging", "");
    const before = rectsBefore.current;
    rectsBefore.current = null;
    if (!before || prefersReducedMotion()) return;
    for (const card of document.querySelectorAll<HTMLElement>(CARD)) {
      const id = card.dataset.flip;
      const old = id ? before.get(id) : undefined;
      if (!old || card.dataset.dragging !== undefined) continue;
      const now = card.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      card.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
        duration: DURATION.move,
        easing: EASE.standard,
      });
    }
  }, [preview]);

  const showOrder = React.useCallback(
    (drag: Dragging, group: string, ids: string[]) => {
      remember(rectsBefore);
      drag.group = group;
      drag.ids = ids;
      drag.settledAt = performance.now() + DURATION.move * 0.6;
      setPreview({ draggedId: drag.draggedId, from: drag.from, group, ids });
    },
    [],
  );

  const retarget = React.useCallback(
    (drag: Dragging) => {
      if (performance.now() < drag.settledAt) return;
      const under = document.elementFromPoint(drag.pointerX, drag.pointerY);
      const card = under?.closest<HTMLElement>(CARD) ?? null;
      const box = card?.parentElement ?? under?.closest<HTMLElement>(GROUP);
      const group = box?.dataset.dragGroup;
      if (!box || !group || !(group in drag.startGroups)) return;
      const targetId = card?.dataset.flip;
      if (targetId === drag.draggedId) return;
      if (group === drag.group) {
        if (!targetId) return;
        const next = moveTo(
          drag.ids,
          drag.draggedId,
          drag.ids.indexOf(targetId),
        );
        if (!sameOrder(next, drag.ids)) showOrder(drag, group, next);
        return;
      }
      // Into another group: it takes the place of the card it's over, or
      // goes at the end.
      const base = drag.startGroups[group].filter(
        (id) => id !== drag.draggedId,
      );
      const at = targetId ? base.indexOf(targetId) : -1;
      showOrder(
        drag,
        group,
        moveTo(base, drag.draggedId, at < 0 ? base.length : at),
      );
    },
    [showOrder],
  );

  const release = React.useCallback((press: Pressed | null) => {
    if (!press) return;
    window.clearTimeout(press.holdTimer);
    press.ring?.remove();
    press.ring = null;
    document.documentElement.classList.remove("note-holding");
  }, []);

  const end = React.useCallback(
    (drop: boolean) => {
      const drag = dragging.current;
      release(pressed.current);
      pressed.current = null;
      dragging.current = null;
      document.documentElement.classList.remove("note-dragging");
      if (!drag) return;
      cancelAnimationFrame(drag.scrollFrame);
      swallowNextClick();

      const moved =
        drag.group !== drag.from ||
        !sameOrder(drag.ids, drag.startGroups[drag.from]);
      if (drop && moved) {
        onDropRef.current(drag.draggedId, drag.from, drag.group, drag.ids);
        setPreview({
          draggedId: drag.draggedId,
          from: drag.from,
          group: drag.group,
          ids: drag.ids,
          settling: true,
        });
        window.setTimeout(
          () => setPreview((shown) => (shown?.settling ? null : shown)),
          SETTLE_TIMEOUT,
        );
      } else {
        remember(rectsBefore);
        setPreview(null);
      }

      // Once the order has settled, the lifted card lands in its place.
      const ghost = drag.ghost;
      const done = () => {
        ghost.remove();
        for (const card of document.querySelectorAll<HTMLElement>(
          "[data-dragging]",
        ))
          delete card.dataset.dragging;
      };
      requestAnimationFrame(() => {
        const card = cardOf(drag.draggedId);
        if (prefersReducedMotion() || !card) return done();
        const slot = card.getBoundingClientRect();
        const left = Number.parseFloat(ghost.style.left);
        const top = Number.parseFloat(ghost.style.top);
        ghost.classList.add("landing");
        ghost
          .animate(
            [
              { transform: ghost.style.transform },
              {
                transform: `translate(${slot.left - left}px, ${slot.top - top}px)`,
              },
            ],
            { duration: DURATION.move * 0.75, easing: EASE.standard },
          )
          .finished.then(done, done);
      });
    },
    [release],
  );

  React.useEffect(() => {
    if (!enabled) return;
    const start = (press: Pressed, e: PointerEvent) => {
      const card = cardOf(press.draggedId);
      if (!card) return;
      release(press);
      const rect = card.getBoundingClientRect();
      // A copy of the card lifts off; the card itself stays as the gap. The
      // copy sits in a box like the list's, so it keeps the card's layout.
      const copy = card.cloneNode(true) as HTMLElement;
      copy.removeAttribute("data-flip");
      for (const el of [copy, ...copy.querySelectorAll("[id]")])
        el.removeAttribute("id");
      Object.assign(copy.style, {
        position: "relative",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
      });
      const ghost = document.createElement("div");
      ghost.className = `${press.box.className} nc-ghost`;
      ghost.setAttribute("aria-hidden", "true");
      Object.assign(ghost.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: "0",
      });
      ghost.append(copy);
      document.body.append(ghost);
      card.dataset.dragging = "";
      document.documentElement.classList.add("note-dragging");
      const drag: Dragging = {
        ...press,
        ghost,
        group: press.from,
        ids: press.startGroups[press.from],
        settledAt: 0,
        pointerX: e.clientX,
        pointerY: e.clientY,
        scrollFrame: 0,
      };
      dragging.current = drag;
      setPreview({
        draggedId: drag.draggedId,
        from: drag.from,
        group: drag.group,
        ids: drag.ids,
      });

      // Near the top or bottom of the list, it scrolls.
      const scroller = scrollParent(press.box);
      const tick = () => {
        if (dragging.current !== drag) return;
        if (scroller) {
          const box = scroller.getBoundingClientRect();
          const above = box.top + EDGE - drag.pointerY;
          const below = drag.pointerY - (box.bottom - EDGE);
          const step =
            above > 0
              ? -Math.min(MAX_SCROLL_STEP, above / 3)
              : below > 0
                ? Math.min(MAX_SCROLL_STEP, below / 3)
                : 0;
          if (step) {
            scroller.scrollTop += step;
            retarget(drag);
          }
        }
        drag.scrollFrame = requestAnimationFrame(tick);
      };
      drag.scrollFrame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const press = pressed.current;
      if (!press || e.pointerId !== press.pointerId) return;
      let drag = dragging.current;
      if (!drag) {
        const distance = Math.hypot(e.clientX - press.x, e.clientY - press.y);
        if (!press.isHeld) {
          // Moved before the hold: the finger is scrolling.
          if (distance > SCROLL_DISTANCE) {
            release(press);
            pressed.current = null;
          }
          return;
        }
        if (distance < START_DISTANCE) return;
        start(press, e);
        drag = dragging.current;
        if (!drag) return;
      }
      e.preventDefault();
      drag.pointerX = e.clientX;
      drag.pointerY = e.clientY;
      drag.ghost.style.transform = `translate(${e.clientX - press.x}px, ${e.clientY - press.y}px)`;
      retarget(drag);
    };
    const onUp = (e: PointerEvent) => {
      const press = pressed.current;
      if (press?.pointerId !== e.pointerId) return;
      if (dragging.current) return end(true);
      const wasHold = press.isTouch && press.isHeld && !!press.ring;
      release(press);
      pressed.current = null;
      // Held and let go where it was: picked, as a long press picks.
      if (wasHold) {
        swallowNextClick();
        onHoldRef.current?.(press.draggedId);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragging.current) {
        e.preventDefault();
        e.stopPropagation();
        end(false);
      }
    };
    const onCancel = () => {
      if (dragging.current) return end(false);
      release(pressed.current);
      pressed.current = null;
    };
    // A held finger moves the card, not the page.
    const onTouchMove = (e: TouchEvent) => {
      if (pressed.current?.isHeld && e.cancelable) e.preventDefault();
    };
    // Nor does holding a card open the browser's menu for its link.
    const onContextMenu = (e: Event) => {
      if (pressed.current?.isTouch) e.preventDefault();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("contextmenu", onContextMenu, { capture: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("contextmenu", onContextMenu, {
        capture: true,
      });
      if (dragging.current) end(false);
      else {
        release(pressed.current);
        pressed.current = null;
      }
    };
  }, [enabled, end, retarget, release]);

  /**
   * Put on each group's card box (marked `data-drag-group`), with every
   * droppable group's current order.
   */
  const onPointerDown = (
    e: React.PointerEvent<HTMLElement>,
    group: string,
    groups: Record<string, string[]>,
  ) => {
    if (!enabled || e.button !== 0 || pressed.current) return;
    if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.closest(OWN_CONTROLS)) return;
    const card = target.closest<HTMLElement>(".nc");
    const id = card?.dataset.flip;
    if (!card || !id || card.parentElement !== e.currentTarget) return;
    const isTouch = e.pointerType !== "mouse";
    const byGrip = !!target.closest(".nc-grip");
    const press: Pressed = {
      draggedId: id,
      from: group,
      startGroups: groups,
      box: e.currentTarget,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      isTouch,
      isHeld: !isTouch || byGrip,
      holdTimer: 0,
      ring: null,
    };
    if (isTouch && !byGrip) {
      press.ring = showRing(e.clientX, e.clientY);
      press.holdTimer = window.setTimeout(() => {
        if (pressed.current !== press) return;
        press.isHeld = true;
        press.ring?.classList.add("held");
        document.documentElement.classList.add("note-holding");
        navigator.vibrate?.(10);
      }, HOLD_MS);
    }
    pressed.current = press;
  };

  /** The list now shows `ids` for `group`: a let-go order can stop being held. */
  const settled = React.useCallback((group: string, ids: string[]) => {
    setPreview((shown) =>
      shown?.settling && shown.group === group && sameOrder(shown.ids, ids)
        ? null
        : shown,
    );
  }, []);

  return { preview, onPointerDown, enabled, settled };
}
