import { translate } from "@/lib/i18n";

/**
 * A flowchart placed in the text: a Delta embed,
 * `{"flowchart": "{\"nodes\":[…],\"edges\":[…]}"}`, written the same way by
 * the Android app (mobile/lib/features/notes/domain/flowchart.dart). Nodes
 * sit at their centres in the chart's own units; their size follows from
 * their shape and text, so every app lays a chart out alike.
 */
export const FLOWCHART_EMBED = "flowchart";

export type FlowShape = "box" | "round" | "diamond";

export const FLOW_SHAPES: readonly FlowShape[] = ["box", "round", "diamond"];

export interface FlowNode {
  id: string;
  x: number;
  y: number;
  text: string;
  shape: FlowShape;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  text?: string;
}

export interface Flowchart {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

const MAX_NODES = 200;
const MAX_TEXT = 200;
/** How far apart new nodes are put, and what positions snap to. */
export const FLOW_GAP = 130;
export const FLOW_GRID = 10;

/** Characters on a line of a node's text before it wraps. */
const LINE_CHARS = { box: 18, round: 18, diamond: 14 } as const;
export const FLOW_LINE_HEIGHT = 18;
export const FLOW_FONT_SIZE = 14;

const text = (value: unknown) =>
  typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").slice(0, MAX_TEXT)
    : "";

const coordinate = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(-100_000, Math.min(100_000, Math.round(value)))
    : 0;

const shapeOf = (value: unknown): FlowShape =>
  FLOW_SHAPES.includes(value as FlowShape) ? (value as FlowShape) : "box";

export function parseFlowchart(value: unknown): Flowchart | null {
  if (typeof value !== "string") return null;
  let data: unknown;
  try {
    data = JSON.parse(value);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const { nodes, edges } = data as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(nodes)) return null;
  const seen = new Set<string>();
  const chart: Flowchart = { nodes: [], edges: [] };
  for (const raw of nodes.slice(0, MAX_NODES)) {
    if (!raw || typeof raw !== "object") continue;
    const node = raw as Record<string, unknown>;
    if (typeof node.id !== "string" || !node.id || seen.has(node.id)) continue;
    seen.add(node.id);
    chart.nodes.push({
      id: node.id,
      x: coordinate(node.x),
      y: coordinate(node.y),
      text: text(node.text),
      shape: shapeOf(node.shape),
    });
  }
  const edgeIds = new Set<string>();
  for (const raw of Array.isArray(edges) ? edges : []) {
    if (!raw || typeof raw !== "object") continue;
    const edge = raw as Record<string, unknown>;
    if (
      typeof edge.id !== "string" ||
      !edge.id ||
      edgeIds.has(edge.id) ||
      typeof edge.from !== "string" ||
      typeof edge.to !== "string" ||
      edge.from === edge.to ||
      !seen.has(edge.from) ||
      !seen.has(edge.to)
    )
      continue;
    edgeIds.add(edge.id);
    const label = text(edge.text).trim();
    chart.edges.push({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      ...(label ? { text: label } : {}),
    });
  }
  return chart;
}

export function encodeFlowchart(chart: Flowchart): string {
  const ids = new Set(chart.nodes.map((node) => node.id));
  return JSON.stringify({
    nodes: chart.nodes.map((node) => ({
      id: node.id,
      x: Math.round(node.x),
      y: Math.round(node.y),
      text: node.text,
      shape: node.shape,
    })),
    edges: chart.edges
      .filter((edge) => ids.has(edge.from) && ids.has(edge.to))
      .map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        ...(edge.text?.trim() ? { text: edge.text.trim() } : {}),
      })),
  });
}

/** A new chart: a start and a first step under it. */
export function starterFlowchart(newId: () => string): Flowchart {
  const start = {
    id: newId(),
    x: 0,
    y: 0,
    text: translate("noteHooks.flowchart")("start"),
    shape: "round" as const,
  };
  const step = {
    id: newId(),
    x: 0,
    y: FLOW_GAP,
    text: translate("noteHooks.flowchart")("step"),
    shape: "box" as const,
  };
  return {
    nodes: [start, step],
    edges: [{ id: newId(), from: start.id, to: step.id }],
  };
}

export const newFlowId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

/** The node's text broken into the lines it is drawn on. */
export function wrapFlowText(value: string, shape: FlowShape): string[] {
  const width = LINE_CHARS[shape];
  const lines: string[] = [];
  for (const paragraph of value.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      for (let rest = word; rest; ) {
        const room = line ? width - line.length - 1 : width;
        if (rest.length <= room) {
          line = line ? `${line} ${rest}` : rest;
          rest = "";
        } else if (line) {
          lines.push(line);
          line = "";
        } else {
          lines.push(rest.slice(0, width));
          rest = rest.slice(width);
        }
      }
    }
    lines.push(line);
  }
  while (lines.length > 1 && !lines[lines.length - 1]) lines.pop();
  return lines;
}

/** Width and height of a node, from its shape and lines of text. */
export function flowNodeSize(node: Pick<FlowNode, "text" | "shape">) {
  const lines = wrapFlowText(node.text, node.shape).length;
  if (node.shape === "diamond")
    return { width: 170, height: Math.max(84, 48 + lines * FLOW_LINE_HEIGHT) };
  return { width: 160, height: Math.max(52, 22 + lines * FLOW_LINE_HEIGHT) };
}

export function flowNodeBox(node: FlowNode): Box {
  const { width, height } = flowNodeSize(node);
  return {
    left: node.x - width / 2,
    top: node.y - height / 2,
    right: node.x + width / 2,
    bottom: node.y + height / 2,
  };
}

/** Where a line from the node's centre towards `toward` leaves its outline. */
export function flowNodeEdgePoint(node: FlowNode, toward: Point): Point {
  const dx = toward.x - node.x;
  const dy = toward.y - node.y;
  if (!dx && !dy) return { x: node.x, y: node.y };
  const { width, height } = flowNodeSize(node);
  const hw = width / 2;
  const hh = height / 2;
  const t =
    node.shape === "diamond"
      ? 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh)
      : Math.min(
          dx ? hw / Math.abs(dx) : Infinity,
          dy ? hh / Math.abs(dy) : Infinity,
        );
  return { x: node.x + dx * t, y: node.y + dy * t };
}

/** The arrow's two ends, on the outlines of the nodes it joins. */
export function flowEdgeEnds(from: FlowNode, to: FlowNode) {
  return {
    start: flowNodeEdgePoint(from, to),
    end: flowNodeEdgePoint(to, from),
  };
}

export function flowNodeAt(chart: Flowchart, point: Point): FlowNode | null {
  for (let i = chart.nodes.length - 1; i >= 0; i--) {
    const node = chart.nodes[i];
    const box = flowNodeBox(node);
    if (
      point.x >= box.left &&
      point.x <= box.right &&
      point.y >= box.top &&
      point.y <= box.bottom
    )
      return node;
  }
  return null;
}

/** The box holding the whole chart, or null for an empty one. */
export function flowchartBounds(chart: Flowchart): Box | null {
  if (!chart.nodes.length) return null;
  const box = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  };
  for (const node of chart.nodes) {
    const own = flowNodeBox(node);
    box.left = Math.min(box.left, own.left);
    box.top = Math.min(box.top, own.top);
    box.right = Math.max(box.right, own.right);
    box.bottom = Math.max(box.bottom, own.bottom);
  }
  return box;
}

/** The outline of a node as an SVG path, in chart units. */
export function flowNodePath(node: FlowNode): string {
  const { left, top, right, bottom } = flowNodeBox(node);
  const r = (n: number) => Number(n.toFixed(1));
  if (node.shape === "diamond")
    return `M${r(node.x)} ${r(top)}L${r(right)} ${r(node.y)}L${r(node.x)} ${r(bottom)}L${r(left)} ${r(node.y)}Z`;
  const radius = node.shape === "round" ? (bottom - top) / 2 : 6;
  return (
    `M${r(left + radius)} ${r(top)}H${r(right - radius)}` +
    `A${radius} ${radius} 0 0 1 ${r(right)} ${r(top + radius)}V${r(bottom - radius)}` +
    `A${radius} ${radius} 0 0 1 ${r(right - radius)} ${r(bottom)}H${r(left + radius)}` +
    `A${radius} ${radius} 0 0 1 ${r(left)} ${r(bottom - radius)}V${r(top + radius)}` +
    `A${radius} ${radius} 0 0 1 ${r(left + radius)} ${r(top)}Z`
  );
}

/** The y of each line of a node's text, centred on the node. */
export function flowTextLines(node: FlowNode) {
  const lines = wrapFlowText(node.text, node.shape);
  const first = node.y - ((lines.length - 1) * FLOW_LINE_HEIGHT) / 2;
  return lines.map((line, i) => ({ line, y: first + i * FLOW_LINE_HEIGHT }));
}

/** An edge label's lines, which wrap like a box's text. */
export const flowEdgeLines = (value: string) => wrapFlowText(value, "box");

/** The words in a chart, for search and plain text. */
export function flowchartText(chart: Flowchart): string {
  return [
    ...chart.nodes.map((node) => node.text),
    ...chart.edges.map((edge) => edge.text ?? ""),
  ]
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

const PADDING = 12;
let svgCount = 0;

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The chart as SVG markup, coloured by the note's CSS (see editor.css) so it
 * follows the note's colour and the theme.
 */
export function flowchartSvg(chart: Flowchart, label: string): string {
  const bounds = flowchartBounds(chart) ?? {
    left: 0,
    top: 0,
    right: 160,
    bottom: 52,
  };
  const x = bounds.left - PADDING;
  const y = bounds.top - PADDING;
  const width = bounds.right - bounds.left + PADDING * 2;
  const height = bounds.bottom - bounds.top + PADDING * 2;
  const byId = new Map(chart.nodes.map((node) => [node.id, node]));
  const arrow = `fc-arrow-${++svgCount}`;
  const parts: string[] = [];
  for (const edge of chart.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const { start, end } = flowEdgeEnds(from, to);
    parts.push(
      `<line class="fc-edge" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" marker-end="url(#${arrow})"/>`,
    );
    if (edge.text)
      parts.push(
        edgeLabelSvg(edge.text, (start.x + end.x) / 2, (start.y + end.y) / 2),
      );
  }
  for (const node of chart.nodes) {
    parts.push(
      `<path class="fc-node" data-shape="${node.shape}" d="${flowNodePath(node)}"/>`,
    );
    for (const { line, y: lineY } of flowTextLines(node))
      parts.push(
        `<text class="fc-text" x="${node.x}" y="${lineY}" dy="0.35em">${escapeXml(line)}</text>`,
      );
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}" ` +
    `width="${width}" role="img" aria-label="${escapeXml(label)}">` +
    `<defs><marker id="${arrow}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">` +
    `<path class="fc-arrow" d="M0 0L10 5L0 10Z"/></marker></defs>${parts.join("")}</svg>`
  );
}

function edgeLabelSvg(value: string, x: number, y: number) {
  const lines = flowEdgeLines(value);
  const longest = Math.max(...lines.map((line) => line.length));
  const width = longest * 7.4 + 12;
  const height = lines.length * FLOW_LINE_HEIGHT + 4;
  const first = y - ((lines.length - 1) * FLOW_LINE_HEIGHT) / 2;
  return (
    `<rect class="fc-label-bg" x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" rx="4"/>` +
    lines
      .map(
        (line, i) =>
          `<text class="fc-label" x="${x}" y="${first + i * FLOW_LINE_HEIGHT}" dy="0.35em">${escapeXml(line)}</text>`,
      )
      .join("")
  );
}

/** The flowcharts a note's stored content shows. */
export function flowchartsIn(content: string | null | undefined): Flowchart[] {
  if (!content) return [];
  let ops: unknown;
  try {
    ops = (JSON.parse(content) as { ops?: unknown })?.ops;
  } catch {
    return [];
  }
  if (!Array.isArray(ops)) return [];
  const charts: Flowchart[] = [];
  for (const op of ops) {
    const insert = (op as { insert?: unknown })?.insert;
    if (!insert || typeof insert !== "object") continue;
    const chart = parseFlowchart(
      (insert as Record<string, unknown>)[FLOWCHART_EMBED],
    );
    if (chart) charts.push(chart);
  }
  return charts;
}

/** A short name for the chart, for screen readers: its first node's text. */
export function flowchartLabel(chart: Flowchart): string {
  const first = chart.nodes.find((node) => node.text.trim())?.text.trim();
  const t = translate("noteHooks.flowchart");
  return first
    ? t("labelWithText", { text: first.replace(/\s+/g, " ") })
    : t("label");
}

/** The arrow nearest `point` within `tolerance`, or null. */
export function flowEdgeAt(
  chart: Flowchart,
  point: Point,
  tolerance: number,
): FlowEdge | null {
  const byId = new Map(chart.nodes.map((node) => [node.id, node]));
  let best: { edge: FlowEdge; distance: number } | null = null;
  for (const edge of chart.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const { start, end } = flowEdgeEnds(from, to);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = dx * dx + dy * dy;
    const t = length
      ? Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) / length,
          ),
        )
      : 0;
    const distance = Math.hypot(
      point.x - (start.x + t * dx),
      point.y - (start.y + t * dy),
    );
    if (distance <= tolerance && (!best || distance < best.distance))
      best = { edge, distance };
  }
  return best?.edge ?? null;
}

/**
 * Where a new node goes beside `from`, on `side`: clear of it by a gap,
 * whatever the two shapes' sizes.
 */
export function flowSpotBeside(
  from: FlowNode,
  side: { x: number; y: number },
  shape: FlowShape = "box",
): Point {
  const own = flowNodeSize(from);
  const next = flowNodeSize({ text: "", shape });
  const gap = side.x ? 70 : 56;
  return {
    x: from.x + side.x * (own.width / 2 + gap + next.width / 2),
    y: from.y + side.y * (own.height / 2 + gap + next.height / 2),
  };
}
