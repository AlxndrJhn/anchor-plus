"use client";

import * as React from "react";
import { DURATION, EASE } from "@/lib/design/tokens";
import { prefersReducedMotion } from "@/lib/motion";
import {
  DROP_ATTRIBUTE,
  type DropTarget,
  draggedNoteIds,
  parseDropTarget,
} from "../columns";

/** The order a group's cards would take if the dragged one were let go now. */
export interface DragPreview {
  group: string;
  draggedId: string;
  ids: string[];
  /**
   * Let go: the order stays shown until the list itself has it, so the cards
   * don't flash back to the old order in between.
   */
  settling?: boolean;
}

/** Columns: cards can also be let go on a tag, Archive or Trash in the sidebar. */
export interface CardDropOut {
  picked: ReadonlySet<string>;
  /** Every note on the board, in its order; picked ones travel in it. */
  shownIds: readonly string[];
  onDrop: (noteIds: string[], target: DropTarget) => void;
}

/** How long a let-go order is held if the list never takes it up. */
const SETTLE_TIMEOUT = 2000;

interface Pressed {
  card: HTMLElement;
  box: HTMLElement;
  group: string;
  draggedId: string;
  startIds: string[];
  /** It can take a new place in its group, not only leave the board. */
  canSort: boolean;
  x: number;
  y: number;
  pointerId: number;
}

interface Dragging extends Pressed {
  ghost: HTMLElement;
  offsetX: number;
  offsetY: number;
  ids: string[];
  /** No new target until the cards have moved out of the way. */
  settledAt: number;
  pointerX: number;
  pointerY: number;
  scrollFrame: number;
  /** The sidebar row under the pointer, when it can be dropped there. */
  overRow: Element | null;
}

const START_DISTANCE = 6;
const EDGE = 64;
const MAX_SCROLL_STEP = 18;

/** Anything in a card that does its own thing on a press. */
const OWN_CONTROLS = "button, input, textarea, select, [role=checkbox]";

const moveTo = (ids: string[], id: string, index: number) => {
  const rest = ids.filter((x) => x !== id);
  rest.splice(index, 0, id);
  return rest;
};

type Remembered = React.RefObject<{
  box: HTMLElement;
  rects: Map<string, DOMRect>;
} | null>;

/** Where the cards of `box` are now, for the slide after the next render. */
function remember(into: Remembered, box: HTMLElement) {
  const rects = new Map<string, DOMRect>();
  for (const card of box.querySelectorAll<HTMLElement>(":scope > .nc"))
    if (card.dataset.flip)
      rects.set(card.dataset.flip, card.getBoundingClientRect());
  into.current = { box, rects };
}

const sameOrder = (a: string[], b: string[]) =>
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

/**
 * Drag to arrange, as in Google Keep: press a card and move, and it lifts
 * off and follows the pointer; the others make room where it would land, so
 * the new order shows before it is let go. Esc puts everything back.
 *
 * Mouse only: on touch screens a press and move scrolls the list.
 */
export function useCardDrag({
  enabled,
  onDrop,
  dropOut,
}: {
  /** Cards can be dragged to new places in their group. */
  enabled: boolean;
  /** The note was let go at a new place; `ids` is its group's new order. */
  onDrop: (draggedId: string, ids: string[]) => void;
  dropOut?: CardDropOut;
}) {
  const active = enabled || !!dropOut;
  const dropOutRef = React.useRef(dropOut);
  dropOutRef.current = dropOut;
  const [preview, setPreview] = React.useState<DragPreview | null>(null);
  const pressed = React.useRef<Pressed | null>(null);
  const dragging = React.useRef<Dragging | null>(null);
  const rectsBefore = React.useRef<{
    box: HTMLElement;
    rects: Map<string, DOMRect>;
  } | null>(null);
  const onDropRef = React.useRef(onDrop);
  onDropRef.current = onDrop;

  // Slides the cards that moved from where they were to where they are.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each preview is drawn
  React.useLayoutEffect(() => {
    const before = rectsBefore.current;
    rectsBefore.current = null;
    if (!before || prefersReducedMotion()) return;
    for (const card of before.box.querySelectorAll<HTMLElement>(
      ":scope > .nc",
    )) {
      const id = card.dataset.flip;
      const old = id ? before.rects.get(id) : undefined;
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

  const showOrder = React.useCallback((drag: Dragging, ids: string[]) => {
    remember(rectsBefore, drag.box);
    drag.ids = ids;
    drag.settledAt = performance.now() + DURATION.move * 0.6;
    setPreview({ group: drag.group, draggedId: drag.draggedId, ids });
  }, []);

  const retarget = React.useCallback(
    (drag: Dragging) => {
      if (!drag.canSort || drag.overRow) return;
      if (performance.now() < drag.settledAt) return;
      const under = document
        .elementFromPoint(drag.pointerX, drag.pointerY)
        ?.closest<HTMLElement>(".nc");
      if (!under || under === drag.card || under.parentElement !== drag.box)
        return;
      const targetId = under.dataset.flip;
      if (!targetId) return;
      const next = moveTo(drag.ids, drag.draggedId, drag.ids.indexOf(targetId));
      if (!sameOrder(next, drag.ids)) showOrder(drag, next);
    },
    [showOrder],
  );

  const end = React.useCallback((drop: boolean) => {
    const drag = dragging.current;
    pressed.current = null;
    dragging.current = null;
    document.documentElement.classList.remove("note-dragging");
    if (!drag) return;
    cancelAnimationFrame(drag.scrollFrame);

    // The press ends in a click on whatever is under the pointer; a drag is
    // not a click.
    const swallow = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(
      () => window.removeEventListener("click", swallow, { capture: true }),
      0,
    );

    const row = drag.overRow;
    row?.removeAttribute("data-drop-over");
    const target = parseDropTarget(row?.getAttribute(DROP_ATTRIBUTE) ?? null);
    const out = dropOutRef.current;
    if (drop && target && out) {
      // It leaves the list, so it doesn't land back in its place.
      remember(rectsBefore, drag.box);
      setPreview(null);
      drag.ghost.remove();
      delete drag.card.dataset.dragging;
      out.onDrop(
        draggedNoteIds(drag.draggedId, out.picked, out.shownIds),
        target,
      );
      return;
    }

    if (drop && !sameOrder(drag.ids, drag.startIds)) {
      onDropRef.current(drag.draggedId, drag.ids);
      setPreview({
        group: drag.group,
        draggedId: drag.draggedId,
        ids: drag.ids,
        settling: true,
      });
      window.setTimeout(
        () => setPreview((shown) => (shown?.settling ? null : shown)),
        SETTLE_TIMEOUT,
      );
    } else {
      remember(rectsBefore, drag.box);
      setPreview(null);
    }

    // Once the order has settled, the lifted card lands in its place.
    const ghost = drag.ghost;
    const done = () => {
      ghost.remove();
      delete drag.card.dataset.dragging;
    };
    requestAnimationFrame(() => {
      if (prefersReducedMotion() || !drag.card.isConnected) return done();
      const slot = drag.card.getBoundingClientRect();
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
  }, []);

  React.useEffect(() => {
    if (!active) return;
    const start = (press: Pressed, e: PointerEvent) => {
      const rect = press.card.getBoundingClientRect();
      // A copy of the card lifts off; the card itself stays as the gap. The
      // copy sits in a box like the list's, so it keeps the card's layout.
      const copy = press.card.cloneNode(true) as HTMLElement;
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
      const out = dropOutRef.current;
      if (out) {
        // Small enough to show the sidebar row it is about to land on,
        // shrinking around the point it was grabbed at.
        ghost.classList.add("nc-ghost-out");
        ghost.style.transformOrigin = `${press.x - rect.left}px ${press.y - rect.top}px`;
        const count = draggedNoteIds(
          press.draggedId,
          out.picked,
          out.shownIds,
        ).length;
        if (count > 1) {
          const badge = document.createElement("span");
          badge.className = "drag-count";
          badge.textContent = String(count);
          ghost.append(badge);
        }
      }
      document.body.append(ghost);
      press.card.dataset.dragging = "";
      document.documentElement.classList.add("note-dragging");
      const drag: Dragging = {
        ...press,
        ghost,
        offsetX: press.x - rect.left,
        offsetY: press.y - rect.top,
        ids: press.startIds,
        settledAt: 0,
        pointerX: e.clientX,
        pointerY: e.clientY,
        scrollFrame: 0,
        overRow: null,
      };
      dragging.current = drag;
      setPreview({
        group: drag.group,
        draggedId: drag.draggedId,
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
        if (
          Math.hypot(e.clientX - press.x, e.clientY - press.y) < START_DISTANCE
        )
          return;
        start(press, e);
        drag = dragging.current;
        if (!drag) return;
      }
      e.preventDefault();
      drag.pointerX = e.clientX;
      drag.pointerY = e.clientY;
      drag.ghost.style.transform = `translate(${e.clientX - press.x}px, ${e.clientY - press.y}px)`;
      if (dropOutRef.current) {
        // The sidebar is outside the board: its rows are found by position.
        const row =
          document
            .elementsFromPoint(e.clientX, e.clientY)
            .map((el) => el.closest(`[${DROP_ATTRIBUTE}]`))
            .find(Boolean) ?? null;
        if (row !== drag.overRow) {
          drag.overRow?.removeAttribute("data-drop-over");
          row?.setAttribute("data-drop-over", "");
          drag.overRow = row;
        }
      }
      retarget(drag);
    };
    const onUp = (e: PointerEvent) => {
      if (pressed.current?.pointerId !== e.pointerId) return;
      if (dragging.current) end(true);
      else pressed.current = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragging.current) {
        e.preventDefault();
        e.stopPropagation();
        end(false);
      }
    };
    const onCancel = () => dragging.current && end(false);

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      window.removeEventListener("keydown", onKey, { capture: true });
      if (dragging.current) end(false);
    };
  }, [active, end, retarget]);

  /** Put on each group's card container. */
  const onPointerDown = (
    e: React.PointerEvent<HTMLElement>,
    group: string,
    ids: string[],
    inPlace = true,
  ) => {
    const canSort = inPlace && enabled;
    if (!(canSort || dropOut) || e.button !== 0 || e.pointerType !== "mouse")
      return;
    if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.closest(OWN_CONTROLS)) return;
    const card = target.closest<HTMLElement>(".nc");
    const id = card?.dataset.flip;
    if (!card || !id || card.parentElement !== e.currentTarget) return;
    pressed.current = {
      card,
      box: e.currentTarget,
      group,
      draggedId: id,
      startIds: ids,
      canSort,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    };
  };

  /** The list now shows `ids` for `group`: a let-go order can stop being held. */
  const settled = React.useCallback((group: string, ids: string[]) => {
    setPreview((shown) =>
      shown?.settling && shown.group === group && sameOrder(shown.ids, ids)
        ? null
        : shown,
    );
  }, []);

  return { preview, onPointerDown, enabled, active, settled };
}
