/**
 * Draws the page as a wireframe, from layout alone: boxes, their colours,
 * borders and corners, and the app's own icons. It never copies a pixel of
 * the screen and never reads text, so nothing the user wrote, no picture and
 * no other window or tab can end up in a debug video:
 *
 * - every line of text is a bar, its width rounded to a coarse grid;
 * - pictures, videos, canvases, frames, drawings and any SVG that isn't one of
 *   the app's Lucide icons are plain grey boxes;
 * - fields show a bar of fixed width when they hold something;
 * - pseudo-elements, shadow DOM, carets and selections aren't drawn at all.
 *
 * Android's recorder films the app and paints over what's personal; here
 * nothing personal is drawn in the first place.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Text bars snap to this many CSS pixels: a bar shows a line, not a word. */
const TEXT_GRID = 16;
const PLACEHOLDER = "rgba(128, 128, 128, 0.38)";
const PLACEHOLDER_EDGE = "rgba(128, 128, 128, 0.6)";

const MEDIA = new Set([
  "IMG",
  "VIDEO",
  "CANVAS",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "PICTURE",
  "AUDIO",
]);
const SKIPPED = new Set([
  "SCRIPT",
  "STYLE",
  "TEMPLATE",
  "NOSCRIPT",
  "HEAD",
  "LINK",
  "META",
  "BR",
  "WBR",
  "OPTION",
  "DATALIST",
]);
const SHAPES = "path,circle,rect,line,polyline,polygon,ellipse";

interface Item {
  key: number[];
  draw: (ctx: CanvasRenderingContext2D) => void;
}

interface TextBlock {
  rects: Box[];
  key: number[];
  alpha: number;
  clip: Box;
  color: string;
}

interface State {
  /** The paint layer this element's own boxes and text go into. */
  path: number[];
  /** The nearest stacking context's layer, where z-indexes compete. */
  stack: number[];
  clip: Box;
  alpha: number;
  block: Element;
  visible: boolean;
}

/**
 * Paints the viewport's wireframe into `ctx`, `scale` canvas pixels per CSS
 * pixel. Elements `skip` matches, and all inside them, aren't drawn.
 */
export function renderWireframe(
  ctx: CanvasRenderingContext2D,
  scale: number,
  skip: (el: Element) => boolean,
) {
  const viewport: Box = {
    x: 0,
    y: 0,
    w: document.documentElement.clientWidth || window.innerWidth,
    h: document.documentElement.clientHeight || window.innerHeight,
  };
  const items: Item[] = [];
  const blocks = new Map<Element, TextBlock>();
  let order = 0;
  const push = (path: number[], draw: Item["draw"]) =>
    items.push({ key: [...path, 0, order++], draw });

  const range = document.createRange();

  const walk = (el: Element, st: State) => {
    if (SKIPPED.has(el.tagName) || skip(el)) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none") return;
    const opacity = Number.parseFloat(cs.opacity);
    if (opacity < 0.01) return;
    const alpha = st.alpha * (Number.isNaN(opacity) ? 1 : opacity);
    const visible = cs.visibility === "visible";
    const contents = cs.display === "contents";
    const rect = el.getBoundingClientRect();
    const box: Box = {
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
    };

    const position = cs.position;
    const positioned = position !== "static";
    let clip = position === "fixed" ? viewport : st.clip;
    // Off screen, or scrolled out of its container: nothing of it shows
    // (what's absolutely placed inside usually sits next to it anyway).
    if (
      !contents &&
      box.w > 0 &&
      box.h > 0 &&
      !intersects(box, clip) &&
      (position === "static" || position === "relative")
    )
      return;

    // CSS painting order, roughly: within a stacking context, negative
    // z-indexes, then what's in flow, then positioned boxes (z-index auto or
    // 0) in document order, then positive z-indexes. A positioned box with
    // z-index auto paints as a layer, but z-indexes inside it compete in the
    // context around it.
    let path = st.path;
    let stack = st.stack;
    const z = Number.parseInt(cs.zIndex, 10);
    const hasZ = !Number.isNaN(z) && (positioned || isFlexOrGridItem(el));
    const context =
      hasZ ||
      position === "fixed" ||
      position === "sticky" ||
      opacity < 1 ||
      cs.transform !== "none" ||
      cs.filter !== "none" ||
      cs.isolation === "isolate";
    if (context) {
      const layer = hasZ ? (z < 0 ? z : z === 0 ? 1 : z + 1) : 1;
      path = [...st.stack, layer, order++];
      stack = path;
    } else if (positioned) {
      path = [...st.stack, 1, order++];
    }

    const block = contents || isInline(cs.display) ? st.block : el;
    const radius = cornerRadius(cs, box);
    let after: Paint | null = null;

    if (visible && !contents && box.w > 0 && box.h > 0) {
      if (MEDIA.has(el.tagName)) {
        push(path, (c) => placeholder(c, box, radius, alpha, clip, scale));
        return;
      }
      if (el instanceof SVGSVGElement) {
        if (el.classList.contains("lucide")) {
          const icon = lucideIcon(el, cs, box);
          if (icon) push(path, (c) => icon(c, alpha, clip, scale));
        } else {
          push(path, (c) => placeholder(c, box, radius, alpha, clip, scale));
        }
        return;
      }
      if (!isInline(cs.display)) {
        const own = boxPaint(cs, box, radius);
        if (own)
          push(path, (c) =>
            withClip(c, clip, scale, alpha, () => own(c, scale)),
          );
        const before = decoration(el, "::before", box, radius);
        if (before)
          push(path, (c) =>
            withClip(c, clip, scale, alpha, () => before(c, scale)),
          );
        after = decoration(el, "::after", box, radius);
      }
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        const field = fieldMarks(el, cs, box);
        if (field)
          push(path, (c) =>
            withClip(c, clip, scale, alpha, () => field(c, scale)),
          );
        return;
      }
    }

    const outerClip = clip;
    if (
      !contents &&
      cs.overflowX !== "visible" &&
      cs.overflowY !== "visible" &&
      box.w > 0
    ) {
      clip = intersection(clip, box);
      if (clip.w <= 0 || clip.h <= 0) return;
    }

    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!visible || !child.textContent?.trim()) continue;
        range.selectNodeContents(child);
        let entry = blocks.get(block);
        for (const r of range.getClientRects()) {
          if (r.width < 0.5 || r.height < 0.5) continue;
          if (!entry) {
            entry = {
              rects: [],
              key: [...path, 0, order++],
              alpha,
              clip,
              color: cs.color,
            };
            blocks.set(block, entry);
          }
          entry.rects.push({ x: r.left, y: r.top, w: r.width, h: r.height });
        }
      } else if (child instanceof Element) {
        walk(child, { path, stack, clip, alpha, block, visible });
      }
    }
    if (after) {
      const paint = after;
      push(path, (c) =>
        withClip(c, outerClip, scale, alpha, () => paint(c, scale)),
      );
    }
  };

  const root = document.documentElement;
  ctx.save();
  ctx.fillStyle = pageColor();
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (document.body)
    walk(document.body, {
      path: [],
      stack: [],
      clip: viewport,
      alpha: 1,
      block: root,
      visible: true,
    });

  for (const block of blocks.values()) {
    const bars = textBars(block.rects);
    items.push({
      key: block.key,
      draw: (c) =>
        withClip(c, block.clip, scale, block.alpha, () => {
          c.fillStyle = block.color;
          c.globalAlpha *= 0.42;
          for (const bar of bars) {
            roundRect(c, bar, bar.h / 2, scale);
            c.fill();
          }
        }),
    });
  }

  items.sort((a, b) => compareKeys(a.key, b.key));
  for (const item of items) item.draw(ctx);
  ctx.restore();
}

/**
 * The lines of a block of text as bars: pieces on one line become one bar,
 * snapped to {@link TEXT_GRID}, about as tall as lowercase letters.
 */
export function textBars(rects: Box[]): Box[] {
  const lines: Box[] = [];
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const r of sorted) {
    const line = lines.find(
      (l) => overlap(l.y, l.y + l.h, r.y, r.y + r.h) > Math.min(l.h, r.h) / 2,
    );
    if (line) {
      const right = Math.max(line.x + line.w, r.x + r.w);
      const bottom = Math.max(line.y + line.h, r.y + r.h);
      line.x = Math.min(line.x, r.x);
      line.y = Math.min(line.y, r.y);
      line.w = right - line.x;
      line.h = bottom - line.y;
    } else {
      lines.push({ ...r });
    }
  }
  return lines.map((l) => {
    const left = Math.floor(l.x / TEXT_GRID) * TEXT_GRID;
    const right = Math.max(
      left + TEXT_GRID,
      Math.ceil((l.x + l.w) / TEXT_GRID) * TEXT_GRID,
    );
    const h = Math.max(3, Math.min(l.h * 0.5, 14));
    return { x: left, y: l.y + (l.h - h) / 2, w: right - left, h };
  });
}

const overlap = (a0: number, a1: number, b0: number, b1: number) =>
  Math.min(a1, b1) - Math.max(a0, b0);

/**
 * What a field shows: a bar of the same width whatever it holds, so its
 * length can't be told either. A check box shows whether it's ticked.
 */
function fieldMarks(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  cs: CSSStyleDeclaration,
  box: Box,
): ((c: CanvasRenderingContext2D, scale: number) => void) | null {
  if (el instanceof HTMLInputElement) {
    if (el.type === "hidden") return null;
    if (el.type === "checkbox" || el.type === "radio") {
      const checked = el.checked;
      return (c, s) => {
        c.strokeStyle = PLACEHOLDER_EDGE;
        c.lineWidth = Math.max(1, s);
        const r = el.type === "radio" ? Math.min(box.w, box.h) / 2 : 3;
        roundRect(c, inset(box, 1), r, s);
        c.stroke();
        if (checked) {
          c.fillStyle = cs.accentColor !== "auto" ? cs.accentColor : cs.color;
          roundRect(c, inset(box, 3), r, s);
          c.fill();
        }
      };
    }
    if (el.type === "range") {
      return (c, s) => {
        c.fillStyle = PLACEHOLDER;
        roundRect(
          c,
          { x: box.x, y: box.y + box.h / 2 - 2, w: box.w, h: 4 },
          2,
          s,
        );
        c.fill();
      };
    }
    if (
      ["button", "submit", "reset", "color", "file", "image"].includes(el.type)
    )
      return null;
  }
  const filled =
    el instanceof HTMLSelectElement
      ? true
      : el.value !== "" || el.placeholder !== "";
  if (!filled) return null;
  const padLeft = Number.parseFloat(cs.paddingLeft) || 0;
  const padRight = Number.parseFloat(cs.paddingRight) || 0;
  const width = Math.max(0, box.w - padLeft - padRight);
  const lineHeight = Number.parseFloat(cs.lineHeight) || 18;
  const muted = el instanceof HTMLSelectElement ? false : el.value === "";
  const lines =
    el instanceof HTMLTextAreaElement
      ? Math.max(
          1,
          Math.min(
            Math.floor((box.h - 8) / lineHeight),
            Math.ceil(el.scrollHeight / lineHeight),
          ),
        )
      : 1;
  return (c, s) => {
    c.fillStyle = cs.color;
    c.globalAlpha *= muted ? 0.2 : 0.42;
    const h = Math.max(3, Math.min(lineHeight * 0.5, 14));
    const top =
      el instanceof HTMLTextAreaElement
        ? box.y + (Number.parseFloat(cs.paddingTop) || 4)
        : box.y + box.h / 2 - lineHeight / 2;
    for (let i = 0; i < lines; i++) {
      const bar = {
        x: box.x + padLeft,
        y: top + i * lineHeight + (lineHeight - h) / 2,
        w: Math.max(
          TEXT_GRID,
          width * (i === lines - 1 && lines > 1 ? 0.5 : 0.6),
        ),
        h,
      };
      roundRect(c, bar, h / 2, s);
      c.fill();
    }
  };
}

/**
 * One of the app's Lucide icons, redrawn from its shapes' geometry only: no
 * attribute but coordinates is read, and nothing it holds can be text.
 */
function lucideIcon(svg: SVGSVGElement, cs: CSSStyleDeclaration, box: Box) {
  const vb = svg.viewBox.baseVal;
  const view =
    vb && vb.width > 0 ? { x: vb.x, y: vb.y, w: vb.width, h: vb.height } : null;
  if (!view) return null;
  const paths: Path2D[] = [];
  for (const shape of svg.querySelectorAll(SHAPES)) {
    const p = shapePath(shape);
    if (p) paths.push(p);
  }
  if (!paths.length) return null;
  const stroke = cs.stroke !== "none" ? cs.stroke : null;
  const fill = cs.fill !== "none" ? cs.fill : null;
  const strokeWidth = Number.parseFloat(cs.strokeWidth) || 2;
  return (
    c: CanvasRenderingContext2D,
    alpha: number,
    clip: Box,
    scale: number,
  ) =>
    withClip(c, clip, scale, alpha, () => {
      const k = Math.min(box.w / view.w, box.h / view.h);
      c.translate(
        (box.x + (box.w - view.w * k) / 2) * scale,
        (box.y + (box.h - view.h * k) / 2) * scale,
      );
      c.scale(k * scale, k * scale);
      c.translate(-view.x, -view.y);
      c.lineCap = "round";
      c.lineJoin = "round";
      c.lineWidth = strokeWidth;
      for (const p of paths) {
        if (fill) {
          c.fillStyle = fill;
          c.fill(p);
        }
        if (stroke) {
          c.strokeStyle = stroke;
          c.stroke(p);
        }
      }
    });
}

const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]*$/;

function shapePath(shape: Element): Path2D | null {
  const n = (name: string) => {
    const v = Number.parseFloat(shape.getAttribute(name) ?? "0");
    return Number.isFinite(v) ? v : 0;
  };
  const p = new Path2D();
  switch (shape.tagName.toLowerCase()) {
    case "path": {
      const d = shape.getAttribute("d") ?? "";
      return d && d.length < 4000 && PATH_DATA.test(d) ? new Path2D(d) : null;
    }
    case "circle":
      p.arc(n("cx"), n("cy"), n("r"), 0, Math.PI * 2);
      return p;
    case "ellipse":
      p.ellipse(n("cx"), n("cy"), n("rx"), n("ry"), 0, 0, Math.PI * 2);
      return p;
    case "rect":
      p.roundRect(n("x"), n("y"), n("width"), n("height"), n("rx"));
      return p;
    case "line":
      p.moveTo(n("x1"), n("y1"));
      p.lineTo(n("x2"), n("y2"));
      return p;
    case "polyline":
    case "polygon": {
      const pts = (shape.getAttribute("points") ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      if (pts.length < 4 || pts.some((v) => !Number.isFinite(v))) return null;
      p.moveTo(pts[0], pts[1]);
      for (let i = 2; i + 1 < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
      if (shape.tagName.toLowerCase() === "polygon") p.closePath();
      return p;
    }
    default:
      return null;
  }
}

type Paint = (c: CanvasRenderingContext2D, scale: number) => void;

const COLOR_IN_SHADOW =
  /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)|#[0-9a-f]{3,8}\b/i;

/**
 * A box's own paint: its background colour (a picture behind it is a grey
 * box), its border, and a shadow drawn as a line or a soft edge.
 */
function boxPaint(
  cs: CSSStyleDeclaration,
  box: Box,
  radius: number,
): Paint | null {
  const bg = cs.backgroundColor;
  const shadow = cs.boxShadow !== "none" ? cs.boxShadow : "";
  const picture = /url\(/.test(cs.backgroundImage);
  const border = borderOf(cs);
  const insetLine =
    !border && /inset/.test(shadow)
      ? (COLOR_IN_SHADOW.exec(shadow)?.[0] ?? PLACEHOLDER)
      : null;
  const outerShadow = !!shadow && !/^[^,]*inset[^,]*$/.test(shadow);
  if (isTransparent(bg) && !border && !picture && !insetLine) return null;
  return (c, scale) => {
    if (!isTransparent(bg)) {
      if (outerShadow) {
        c.shadowColor = "rgba(0, 0, 0, 0.2)";
        c.shadowBlur = 14 * scale;
        c.shadowOffsetY = 3 * scale;
      }
      c.fillStyle = bg;
      roundRect(c, box, radius, scale);
      c.fill();
      c.shadowColor = "transparent";
    }
    if (picture) {
      c.fillStyle = PLACEHOLDER;
      roundRect(c, box, radius, scale);
      c.fill();
    }
    if (border) {
      c.strokeStyle = border.color;
      c.lineWidth = Math.max(1, border.width * scale);
      roundRect(c, inset(box, border.width / 2), radius, scale);
      c.stroke();
    } else if (insetLine) {
      c.strokeStyle = insetLine;
      c.lineWidth = Math.max(1, scale);
      roundRect(c, inset(box, 0.5), radius, scale);
      c.stroke();
    }
  };
}

/**
 * A ::before or ::after laid over its whole element (inset 0), for a border
 * or a tint. Its `content` is never read.
 */
function decoration(
  el: Element,
  pseudo: "::before" | "::after",
  box: Box,
  radius: number,
): Paint | null {
  const ps = getComputedStyle(el, pseudo);
  if (ps.content === "none" || ps.content === "normal" || ps.display === "none")
    return null;
  if (ps.position !== "absolute" && ps.position !== "fixed") return null;
  const zero = (v: string) => v === "0px" || v === "0";
  if (!zero(ps.top) || !zero(ps.left) || !zero(ps.right) || !zero(ps.bottom))
    return null;
  const opacity = Number.parseFloat(ps.opacity);
  if (opacity < 0.01) return null;
  const paint = boxPaint(ps, box, cornerRadius(ps, box) || radius);
  if (!paint) return null;
  return (c, scale) => {
    c.globalAlpha *= Number.isNaN(opacity) ? 1 : opacity;
    paint(c, scale);
  };
}

function placeholder(
  c: CanvasRenderingContext2D,
  box: Box,
  radius: number,
  alpha: number,
  clip: Box,
  scale: number,
) {
  withClip(c, clip, scale, alpha, () => {
    c.fillStyle = PLACEHOLDER;
    roundRect(c, box, radius, scale);
    c.fill();
    c.strokeStyle = PLACEHOLDER_EDGE;
    c.lineWidth = Math.max(1, scale);
    c.stroke();
  });
}

function withClip(
  c: CanvasRenderingContext2D,
  clip: Box,
  scale: number,
  alpha: number,
  draw: () => void,
) {
  c.save();
  c.globalAlpha = alpha;
  c.beginPath();
  c.rect(clip.x * scale, clip.y * scale, clip.w * scale, clip.h * scale);
  c.clip();
  c.beginPath();
  draw();
  c.restore();
}

function roundRect(
  c: CanvasRenderingContext2D,
  b: Box,
  r: number,
  scale: number,
) {
  c.beginPath();
  const radius = Math.max(0, Math.min(r, b.w / 2, b.h / 2));
  c.roundRect(
    b.x * scale,
    b.y * scale,
    b.w * scale,
    b.h * scale,
    radius * scale,
  );
}

function cornerRadius(cs: CSSStyleDeclaration, box: Box) {
  const v = cs.borderTopLeftRadius.split(" ")[0] ?? "0";
  const n = Number.parseFloat(v) || 0;
  return v.endsWith("%") ? (Math.min(box.w, box.h) * n) / 100 : n;
}

function borderOf(cs: CSSStyleDeclaration) {
  const sides = ["Top", "Right", "Bottom", "Left"] as const;
  for (const side of sides) {
    const width = Number.parseFloat(
      cs.getPropertyValue(`border-${side.toLowerCase()}-width`),
    );
    const style = cs.getPropertyValue(`border-${side.toLowerCase()}-style`);
    const color = cs.getPropertyValue(`border-${side.toLowerCase()}-color`);
    if (
      width > 0 &&
      style !== "none" &&
      style !== "hidden" &&
      !isTransparent(color)
    )
      return { width, color };
  }
  return null;
}

export function isTransparent(color: string) {
  const c = color.trim();
  return (
    !c ||
    c === "transparent" ||
    /,\s*0(?:\.0+)?\s*\)$/.test(c) ||
    /\/\s*0(?:\.0+)?%?\s*\)$/.test(c)
  );
}

/** Flex and grid items take a z-index without being positioned. */
function isFlexOrGridItem(el: Element) {
  const parent = el.parentElement;
  if (!parent) return false;
  const display = getComputedStyle(parent).display;
  return /flex|grid/.test(display);
}

const isInline = (display: string) =>
  display === "inline" || display === "ruby" || display === "contents";

function pageColor() {
  for (const el of [document.documentElement, document.body]) {
    if (!el) continue;
    const bg = getComputedStyle(el).backgroundColor;
    if (!isTransparent(bg)) return bg;
  }
  return "#ffffff";
}

function intersects(a: Box, b: Box) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

function intersection(a: Box, b: Box): Box {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {
    x,
    y,
    w: Math.min(a.x + a.w, b.x + b.w) - x,
    h: Math.min(a.y + a.h, b.y + b.h) - y,
  };
}

const inset = (b: Box, d: number): Box => ({
  x: b.x + d,
  y: b.y + d,
  w: Math.max(0, b.w - 2 * d),
  h: Math.max(0, b.h - 2 * d),
});

function compareKeys(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
