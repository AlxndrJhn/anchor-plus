import { usePreferencesStore } from "@/features/preferences";

/** How long a card flies into its new place, gathering speed. */
export const STRIKE_TRAVEL = 230;
/** How long the knock back from the impact takes. */
const STRIKE_BOUNCE = 140;
const SPARK_COLORS = ["#FFFFFF", "#FFF6C8", "#FFC94A", "#FF7A2E"];
const GRAVITY = 1400;

/** How far a card that moved by (dx, dy) knocks back on the impact. */
export function knockBack(dx: number, dy: number): [number, number] {
  const distance = Math.hypot(dx, dy);
  if (!distance) return [0, 0];
  const knock = Math.min(6, distance * 0.06);
  return [(dx / distance) * knock, (dy / distance) * knock];
}

/**
 * Moves [item], now in its new place [rect], from (dx, dy) away as if it
 * were struck there with a hammer: it speeds up, hits, knocks back a little
 * and, if sparks are on in Settings, throws a few, like steel hit on an anvil. They are drawn
 * in [layer], whose own place is [origin] (scrolled by [scroll]).
 */
export function strikeIntoPlace(
  item: HTMLElement,
  dx: number,
  dy: number,
  rect: DOMRect,
  layer: HTMLElement,
  origin: { left: number; top: number; scrollLeft: number; scrollTop: number },
) {
  const [kx, ky] = knockBack(dx, dy);
  const impact = STRIKE_TRAVEL / (STRIKE_TRAVEL + STRIKE_BOUNCE);
  item.animate(
    [
      {
        transform: `translate(${dx}px, ${dy}px)`,
        easing: "cubic-bezier(0.55, 0, 1, 0.45)",
      },
      { transform: "none", offset: impact, easing: "ease-out" },
      {
        transform: `translate(${kx}px, ${ky}px)`,
        offset: impact + (1 - impact) / 2,
        easing: "ease-in",
      },
      { transform: "none" },
    ],
    { duration: STRIKE_TRAVEL + STRIKE_BOUNCE },
  );
  if (usePreferencesStore.getState().editor.strikeSparks !== true) return;
  window.setTimeout(() => {
    if (!layer.isConnected) return;
    // It hits with its leading edge, the one it flies towards.
    const distance = Math.hypot(dx, dy);
    const hx = -dx / distance;
    const hy = -dy / distance;
    const reach = Math.min(
      Math.abs(hx) < 1e-6 ? Infinity : rect.width / 2 / Math.abs(hx),
      Math.abs(hy) < 1e-6 ? Infinity : rect.height / 2 / Math.abs(hy),
    );
    throwSparks(
      layer,
      rect.left - origin.left + origin.scrollLeft + rect.width / 2 + hx * reach,
      rect.top - origin.top + origin.scrollTop + rect.height / 2 + hy * reach,
      hx,
      hy,
      Math.abs(hy) * rect.width + Math.abs(hx) * rect.height,
    );
  }, STRIKE_TRAVEL);
}

/**
 * A few sparks in [layer] from along the face, [span] wide around (x, y),
 * of a card that hit heading (hx, hy): out to both sides of it, a little
 * ahead.
 */
function throwSparks(
  layer: HTMLElement,
  centerX: number,
  centerY: number,
  hx: number,
  hy: number,
  span: number,
) {
  const [fx, fy] = [-hy, hx];
  const count = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const along = span * (Math.random() - 0.5) * 0.8;
    const x = centerX + fx * along;
    const y = centerY + fy * along;
    const side = Math.random() < 0.5 ? 1 : -1;
    const tilt = -0.3 + Math.random() * 1.1;
    const speed = 160 + Math.random() * 260;
    const vx = (fx * side * Math.cos(tilt) + hx * Math.sin(tilt)) * speed;
    const vy = (fy * side * Math.cos(tilt) + hy * Math.sin(tilt)) * speed;
    const life = 180 + Math.random() * 240;
    const length = 4 + Math.random() * 6;
    const spark = document.createElement("div");
    spark.setAttribute("aria-hidden", "true");
    Object.assign(spark.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${length}px`,
      height: "2px",
      marginTop: "-1px",
      borderRadius: "1px",
      pointerEvents: "none",
      zIndex: "3",
      transformOrigin: "100% 50%",
      boxShadow: "0 0 4px 1px rgb(255 122 46 / 0.6)",
    });
    const frames: Keyframe[] = [];
    const steps = 6;
    for (let step = 0; step <= steps; step++) {
      const age = step / steps;
      const t = (age * life) / 1000;
      const px = x + vx * t;
      const py = y + vy * t + (GRAVITY * t * t) / 2;
      const turn = Math.atan2(vy + GRAVITY * t, vx);
      frames.push({
        // Drawn from its tail to its head, the head where it is.
        transform: `translate(${px - length}px, ${py}px) rotate(${turn}rad) scaleX(${1 - age * 0.6})`,
        backgroundColor:
          SPARK_COLORS[
            Math.min(
              SPARK_COLORS.length - 1,
              Math.floor(age * SPARK_COLORS.length),
            )
          ],
        opacity: 1 - age * age,
      });
    }
    layer.append(spark);
    const animation = spark.animate(frames, {
      duration: life,
      fill: "forwards",
    });
    animation.onfinish = () => spark.remove();
    animation.oncancel = () => spark.remove();
  }
}
