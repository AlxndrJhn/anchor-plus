import { usePreferencesStore } from "@/features/preferences";
import { prefersReducedMotion } from "./motion";

/** How long a card takes to burn away, in ms. */
export const DESTROY_MS = 1100;
/** How long the last sparks keep flying, fading out, once the card is gone. */
export const SPARKS_TAIL_MS = 500;
/** The end of that fade, in the effect's time (1 = the card is gone). */
const TAIL_END = 1 + SPARKS_TAIL_MS / DESTROY_MS;

/** The jolt takes the start of the effect; the burn the rest. */
const JOLT_END = 0.14;
/** How far the glowing edge reaches into the card, in thresholds. */
const EDGE = 0.1;
/** Room around the card for the sparks, in px. */
const MARGIN = 40;
const GLOW = ["#FFF6C8", "#FFC94A", "#FF7A2E", "#E2362B"];

export interface BurnPattern {
  columns: number;
  rows: number;
  cell: number;
  /** One per block, row by row: when it burns, from 0 (first) to 1 (last). */
  thresholds: number[];
}

/** A small seeded random, so a card always burns the same way. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Where a card burns first: smooth patches, like Balatro's dissolve. */
export function burnPattern(
  width: number,
  height: number,
  seed = 0,
): BurnPattern {
  // Small cards in fine pixels; a whole page in coarser ones.
  const cell = Math.min(14, Math.max(5, Math.sqrt((width * height) / 1800)));
  const columns = Math.max(1, Math.ceil(width / cell));
  const rows = Math.max(1, Math.ceil(height / cell));
  const random = seeded(seed);
  // Patches about a quarter of the card across, so it burns in holes that
  // spread rather than in specks.
  const blob = Math.min(90, Math.max(24, Math.min(width, height) / 4)) / cell;
  const lw = Math.ceil(columns / blob) + 2;
  const lattice = Array.from(
    { length: lw * (Math.ceil(rows / blob) + 2) },
    random,
  );
  const at = (x: number, y: number) => lattice[y * lw + x];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const raw: number[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const fx = x / blob;
      const fy = y / blob;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = smooth(fx - ix);
      const ty = smooth(fy - iy);
      const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
      const bottom =
        at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
      raw.push(top + (bottom - top) * ty + random() * 0.08);
    }
  }
  const low = Math.min(...raw);
  const span = Math.max(...raw) - low || 1;
  return { columns, rows, cell, thresholds: raw.map((v) => (v - low) / span) };
}

/**
 * How far the burn has gone at t (0 to 1 of the effect), to just past 1.
 * Past 1 (the sparks' tail) it keeps going at about its final pace.
 */
export function burnFront(t: number): number {
  if (t <= JOLT_END) return 0;
  if (t > 1) return burnFront(1) + (t - 1) * 2.2;
  const d = (t - JOLT_END) / (1 - JOLT_END);
  return d * d * (1 + EDGE * 1.2);
}

/** How visible the sparks are at t: fully, then fading over the tail. */
export function sparkOpacity(t: number): number {
  return t <= 1 ? 1 : Math.max(0, 1 - (t - 1) / (TAIL_END - 1));
}

export type BlockState = "whole" | "burning" | "gone";

export function blockState(threshold: number, front: number): BlockState {
  if (threshold < front - EDGE) return "gone";
  if (threshold < front) return "burning";
  return "whole";
}

/**
 * The whole blocks as a clip path, a rectangle per run of them in a row, in
 * the card's own pixels.
 */
export function wholeBlocksPath(
  pattern: BurnPattern,
  front: number,
  width: number,
  height: number,
): string {
  const { columns, rows, cell, thresholds } = pattern;
  let path = "";
  for (let y = 0; y < rows; y++) {
    const top = y * cell;
    const bottom = Math.min(height, top + cell);
    let start = -1;
    for (let x = 0; x <= columns; x++) {
      const whole =
        x < columns &&
        blockState(thresholds[y * columns + x], front) === "whole";
      if (whole && start < 0) start = x;
      if (!whole && start >= 0) {
        const left = start * cell;
        const right = Math.min(width, x * cell);
        path += `M${left} ${top}H${right}V${bottom}H${left}Z`;
        start = -1;
      }
    }
  }
  // An empty path would show the whole card.
  return path || "M0 0Z";
}

export interface Burn {
  /** Settles when the burn is over; the element is left invisible. */
  done: Promise<void>;
  /** Brings the element back, for when the delete fails. */
  restore: () => void;
}

const NO_BURN: Burn = { done: Promise.resolve(), restore: () => {} };

/**
 * Burns [el] away in place, as Balatro destroys a card: a jolt, then it
 * dissolves in glowing pixels and sparks. It keeps its place in the page
 * until the burn is over, so nothing moves into it meanwhile; it's left
 * invisible, for the caller to remove.
 */
export function burnElement(el: HTMLElement): Burn {
  if (
    prefersReducedMotion() ||
    usePreferencesStore.getState().editor.burnDeleted !== true
  )
    return NO_BURN;
  const first = el.getBoundingClientRect();
  if (first.width === 0 || first.height === 0) return NO_BURN;
  const { width, height } = first;

  const saved = {
    transform: el.style.transform,
    filter: el.style.filter,
    clipPath: el.style.clipPath,
    transition: el.style.transition,
    pointerEvents: el.style.pointerEvents,
  };
  const canvas = document.createElement("canvas");
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const area = { w: width + MARGIN * 2, h: height + MARGIN * 2 };
  canvas.width = Math.ceil(area.w * ratio);
  canvas.height = Math.ceil(area.h * ratio);
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    width: `${area.w}px`,
    height: `${area.h}px`,
    zIndex: "var(--z-float, 50)",
    pointerEvents: "none",
  });
  document.body.append(canvas);
  el.style.transition = "none";
  el.style.pointerEvents = "none";

  const pattern = burnPattern(
    width,
    height,
    Math.round(first.left * 31 + first.top * 17),
  );
  const context = canvas.getContext("2d");
  let frameId = 0;
  let finish = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const start = performance.now();
  let gone = false;
  const frame = (now: number) => {
    const t = Math.min(TAIL_END, (now - start) / DESTROY_MS);
    const front = burnFront(t);
    if (gone) {
      // The card is gone; its last sparks fly on where it was, fading.
      if (context)
        drawBurn(
          context,
          pattern,
          front,
          width,
          height,
          ratio,
          sparkOpacity(t),
        );
      if (t < TAIL_END) frameId = requestAnimationFrame(frame);
      else canvas.remove();
      return;
    }
    // The jolt: a shake that settles, a little bigger, a flash.
    const jolt = Math.max(0, 1 - t / JOLT_END);
    if (jolt > 0) {
      const grow = 1 + 0.06 * Math.sin((t / JOLT_END) * Math.PI);
      el.style.transform = `translateX(${Math.sin(t * 130) * 4 * jolt}px) rotate(${Math.sin(t * 90) * 0.05 * jolt}rad) scale(${grow})`;
      el.style.filter = `brightness(${1 + 0.6 * jolt})`;
    } else {
      el.style.transform = saved.transform;
      el.style.filter = saved.filter;
    }
    el.style.clipPath = `path("${wholeBlocksPath(pattern, front, width, height)}")`;
    // Follows the element, should the page scroll.
    const rect = jolt > 0 ? first : el.getBoundingClientRect();
    canvas.style.left = `${rect.left - MARGIN}px`;
    canvas.style.top = `${rect.top - MARGIN}px`;
    if (context) drawBurn(context, pattern, front, width, height, ratio);
    if (t >= 1) {
      gone = true;
      finish();
    }
    frameId = requestAnimationFrame(frame);
  };
  frameId = requestAnimationFrame(frame);
  return {
    done,
    restore: () => {
      cancelAnimationFrame(frameId);
      canvas.remove();
      Object.assign(el.style, saved);
      finish();
    },
  };
}

/** Burns several elements at once, as one. */
function burnAll(elements: HTMLElement[]): Burn {
  const burns = elements.map(burnElement);
  return {
    done: Promise.all(burns.map((b) => b.done)).then(() => {}),
    restore: () => {
      for (const burn of burns) burn.restore();
    },
  };
}

/** The glowing edge and the sparks, around the card's whole blocks. */
function drawBurn(
  context: CanvasRenderingContext2D,
  pattern: BurnPattern,
  front: number,
  width: number,
  height: number,
  ratio: number,
  opacity = 1,
) {
  const { columns, rows, cell, thresholds } = pattern;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.globalAlpha = opacity;
  context.clearRect(0, 0, width + MARGIN * 2, height + MARGIN * 2);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const threshold = thresholds[y * columns + x];
      const left = MARGIN + x * cell;
      const top = MARGIN + y * cell;
      const w = Math.min(cell, MARGIN + width - left);
      const h = Math.min(cell, MARGIN + height - top);
      const state = blockState(threshold, front);
      if (state === "burning") {
        // Hottest at the very edge, cooling into the card.
        const heat = Math.min(0.999, (front - threshold) / EDGE);
        context.fillStyle = GLOW[Math.floor(heat * GLOW.length)];
        context.fillRect(left, top, w, h);
      } else if (state === "gone" && (x * 7 + y * 13) % 5 === 0) {
        // Some burnt blocks fly off as sparks, up and away.
        const age = (front - EDGE - threshold) * 2.2;
        if (age > 1) continue;
        const drift = Math.sin(x * 12.9898 + y * 78.233) * 22;
        const size = cell * 0.6 * (1 - age);
        context.globalAlpha = 0.9 * opacity;
        context.fillStyle =
          GLOW[Math.min(GLOW.length - 1, Math.floor(age * GLOW.length))];
        context.fillRect(
          left + w / 2 + drift * age - size / 2,
          top + h / 2 - 46 * age - size / 2,
          size,
          size,
        );
        context.globalAlpha = opacity;
      }
    }
  }
}

/** Burns away, in place, the cards of notes [ids] on screen. */
export function burnNoteCards(ids: readonly string[]): Burn {
  return burnAll(
    ids.flatMap((id) => {
      const card = document.querySelector<HTMLElement>(
        `article.nc[data-flip="${CSS.escape(id)}"]`,
      );
      return card ? [card] : [];
    }),
  );
}

/** Lists glide their cards to new places when this is announced. */
export const NOTES_WILL_CHANGE = "anchor:notes-will-change";

/** Tells the lists on screen that cards are about to go or move. */
export function announceNotesWillChange() {
  window.dispatchEvent(new Event(NOTES_WILL_CHANGE));
}

/**
 * Burns note [id]'s card in place once it's on screen: for a note deleted
 * while open, whose list shows as the note closes. Gives up after [wait]
 * ms, e.g. when the list it went back to doesn't show it.
 */
export async function burnNoteCardWhenShown(
  id: string,
  wait = 1500,
): Promise<Burn> {
  const until = performance.now() + wait;
  while (performance.now() < until) {
    const card = document.querySelector<HTMLElement>(
      `article.nc[data-flip="${CSS.escape(id)}"]`,
    );
    if (card && card.getBoundingClientRect().width > 0) {
      // Let the list settle after the note closes.
      await new Promise((resolve) => setTimeout(resolve, 150));
      return burnElement(card);
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return NO_BURN;
}
