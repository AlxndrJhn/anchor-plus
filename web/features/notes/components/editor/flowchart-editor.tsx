"use client";

import {
  Diamond,
  Maximize,
  RectangleHorizontal,
  Redo2,
  Square,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { IconButton } from "@/components/ui/button";
import { isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";
import {
  FLOW_GRID,
  FLOW_LINE_HEIGHT,
  type Flowchart,
  type FlowEdge,
  type FlowNode,
  type FlowShape,
  flowchartBounds,
  flowEdgeAt,
  flowEdgeEnds,
  flowEdgeLines,
  flowNodeAt,
  flowNodeBox,
  flowNodePath,
  flowSpotBeside,
  flowTextLines,
  newFlowId,
} from "../../flowcharts";

type Selection = { kind: "node" | "edge"; id: string } | null;

interface View {
  x: number;
  y: number;
  zoom: number;
}

type Drag =
  | {
      kind: "move";
      id: string;
      from: { x: number; y: number };
      at: { x: number; y: number };
      before: Flowchart;
      moved: boolean;
    }
  | {
      kind: "link";
      from: string;
      side: Side;
      to: { x: number; y: number };
      moved: boolean;
    }
  | { kind: "pan"; start: { x: number; y: number }; view: View };

type Side = "top" | "right" | "bottom" | "left";
const SIDES: Side[] = ["top", "right", "bottom", "left"];
const STEP: Record<Side, { x: number; y: number }> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

const SHAPE_ICONS: Record<FlowShape, React.ReactNode> = {
  box: <Square />,
  round: <RectangleHorizontal />,
  diamond: <Diamond />,
};

const snap = (value: number) => Math.round(value / FLOW_GRID) * FLOW_GRID;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const clampZoom = (zoom: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export interface FlowchartEditorHandle {
  /** The chart as it is now, with any text being typed kept. */
  current: () => Flowchart;
}

/**
 * Draws a flowchart to change: drag a box to move it; drag one of the dots
 * round a picked box to another box to join them, or into space for a new
 * box; double-click a box, an arrow or space to write. Delete removes what's
 * picked; Ctrl+Z undoes.
 */
export const FlowchartEditor = React.forwardRef<
  FlowchartEditorHandle,
  { initial: Flowchart; onChange?: () => void }
>(({ initial, onChange }, ref) => {
  const t = useTranslations("editorMedia.flowchart");
  const tc = useTranslations("common");
  const [chart, setChart] = React.useState(initial);
  const [past, setPast] = React.useState<Flowchart[]>([]);
  const [future, setFuture] = React.useState<Flowchart[]>([]);
  const [selection, setSelection] = React.useState<Selection>(null);
  const [editing, setEditing] = React.useState<Selection>(null);
  const [draft, setDraft] = React.useState("");
  const [view, setView] = React.useState<View>({ x: 0, y: 0, zoom: 1 });
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const canvas = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef(chart);
  chartRef.current = chart;
  const editingRef = React.useRef({ editing, draft });
  editingRef.current = { editing, draft };
  const descriptionId = React.useId();

  const nodeById = React.useMemo(
    () => new Map(chart.nodes.map((node) => [node.id, node])),
    [chart.nodes],
  );

  const commit = React.useCallback(
    (next: Flowchart, before: Flowchart = chartRef.current) => {
      if (next === before) return;
      setPast((list) => [...list.slice(-99), before]);
      setFuture([]);
      setChart(next);
      chartRef.current = next;
      onChange?.();
    },
    [onChange],
  );

  const withText = React.useCallback(
    (base: Flowchart, target: Selection, value: string): Flowchart => {
      if (!target) return base;
      if (target.kind === "node")
        return {
          ...base,
          nodes: base.nodes.map((node) =>
            node.id === target.id ? { ...node, text: value } : node,
          ),
        };
      return {
        ...base,
        edges: base.edges.map((edge) =>
          edge.id === target.id
            ? { ...edge, text: value.trim() || undefined }
            : edge,
        ),
      };
    },
    [],
  );

  const finishEditing = React.useCallback(
    (keep = true) => {
      const { editing: target, draft: value } = editingRef.current;
      if (!target) return;
      setEditing(null);
      editingRef.current = { editing: null, draft: "" };
      if (!keep) return;
      const now = chartRef.current;
      const was =
        target.kind === "node"
          ? now.nodes.find((n) => n.id === target.id)?.text
          : (now.edges.find((e) => e.id === target.id)?.text ?? "");
      if (was === undefined || was === value) return;
      commit(withText(now, target, value));
    },
    [commit, withText],
  );

  React.useImperativeHandle(
    ref,
    () => ({
      current: () => {
        const { editing: target, draft: value } = editingRef.current;
        return target
          ? withText(chartRef.current, target, value)
          : chartRef.current;
      },
    }),
    [withText],
  );

  const startEditing = (target: NonNullable<Selection>) => {
    finishEditing();
    const now = chartRef.current;
    const value =
      target.kind === "node"
        ? (now.nodes.find((n) => n.id === target.id)?.text ?? "")
        : (now.edges.find((e) => e.id === target.id)?.text ?? "");
    setSelection(target);
    setDraft(value);
    setEditing(target);
  };

  const fit = React.useCallback(() => {
    const box = canvas.current?.getBoundingClientRect();
    const bounds = flowchartBounds(chartRef.current);
    if (!box || !box.width) return;
    if (!bounds) {
      setView({ x: box.width / 2, y: box.height / 3, zoom: 1 });
      return;
    }
    const margin = 48;
    const zoom = clampZoom(
      Math.min(
        1.2,
        (box.width - margin * 2) / (bounds.right - bounds.left),
        (box.height - margin * 2) / (bounds.bottom - bounds.top),
      ),
    );
    setView({
      zoom,
      x: box.width / 2 - ((bounds.left + bounds.right) / 2) * zoom,
      y: box.height / 2 - ((bounds.top + bounds.bottom) / 2) * zoom,
    });
  }, []);

  React.useLayoutEffect(() => {
    fit();
  }, [fit]);

  const toChart = (clientX: number, clientY: number) => {
    const box = canvas.current?.getBoundingClientRect();
    return {
      x: (clientX - (box?.left ?? 0) - view.x) / view.zoom,
      y: (clientY - (box?.top ?? 0) - view.y) / view.zoom,
    };
  };

  /** A spot near `near` that no box covers yet. */
  const freeSpot = (near: { x: number; y: number }, step = { x: 0, y: 1 }) => {
    let spot = { x: snap(near.x), y: snap(near.y) };
    for (let i = 0; i < 12 && flowNodeAt(chartRef.current, spot); i++)
      spot = {
        x:
          spot.x +
          (step.x
            ? step.x * 190
            : 190 * (i % 2 ? -1 : 1) * Math.ceil((i + 1) / 2)),
        y: spot.y + (step.y ? step.y * 90 : 0),
      };
    return spot;
  };

  const addNode = (
    shape: FlowShape,
    at?: { x: number; y: number },
    from?: { id: string; side: Side },
  ) => {
    finishEditing();
    const now = chartRef.current;
    let spot = at;
    if (!spot) {
      const picked =
        selection?.kind === "node" ? nodeById.get(selection.id) : undefined;
      if (picked) spot = freeSpot(flowSpotBeside(picked, STEP.bottom, shape));
      else {
        const box = canvas.current?.getBoundingClientRect();
        spot = freeSpot(
          box
            ? toChart(box.left + box.width / 2, box.top + box.height / 2)
            : { x: 0, y: 0 },
        );
      }
    }
    const node: FlowNode = {
      id: newFlowId(),
      x: snap(spot.x),
      y: snap(spot.y),
      text: t(`newText.${shape}`),
      shape,
    };
    const link =
      from ??
      (!at && selection?.kind === "node" && nodeById.has(selection.id)
        ? { id: selection.id }
        : undefined);
    const edges: FlowEdge[] = link
      ? [...now.edges, { id: newFlowId(), from: link.id, to: node.id }]
      : now.edges;
    commit({ nodes: [...now.nodes, node], edges });
    reveal(node);
    setSelection({ kind: "node", id: node.id });
    setDraft(node.text);
    setEditing({ kind: "node", id: node.id });
  };

  /** Moves the view so that `node` shows, when it is out of sight. */
  const reveal = (node: FlowNode) => {
    const box = canvas.current?.getBoundingClientRect();
    if (!box) return;
    const own = flowNodeBox(node);
    const margin = 40;
    setView((now) => {
      const left = now.x + own.left * now.zoom;
      const right = now.x + own.right * now.zoom;
      const top = now.y + own.top * now.zoom;
      const bottom = now.y + own.bottom * now.zoom;
      let dx = 0;
      let dy = 0;
      if (left < margin) dx = margin - left;
      else if (right > box.width - margin) dx = box.width - margin - right;
      if (top < margin) dy = margin - top;
      else if (bottom > box.height - margin) dy = box.height - margin - bottom;
      return dx || dy ? { ...now, x: now.x + dx, y: now.y + dy } : now;
    });
  };

  /** What is under the pointer: a box first, then an arrow. */
  const hit = (point: { x: number; y: number }): Selection => {
    const node = flowNodeAt(chartRef.current, point);
    if (node) return { kind: "node", id: node.id };
    const edge = flowEdgeAt(chartRef.current, point, 9 / view.zoom);
    return edge ? { kind: "edge", id: edge.id } : null;
  };

  const join = (from: string, to: string) => {
    const now = chartRef.current;
    if (from === to) return;
    const existing = now.edges.find(
      (edge) => edge.from === from && edge.to === to,
    );
    if (existing) {
      setSelection({ kind: "edge", id: existing.id });
      return;
    }
    const edge = { id: newFlowId(), from, to };
    commit({ ...now, edges: [...now.edges, edge] });
    setSelection({ kind: "edge", id: edge.id });
  };

  const removeSelection = () => {
    if (!selection) return;
    finishEditing(false);
    const now = chartRef.current;
    if (selection.kind === "node")
      commit({
        nodes: now.nodes.filter((node) => node.id !== selection.id),
        edges: now.edges.filter(
          (edge) => edge.from !== selection.id && edge.to !== selection.id,
        ),
      });
    else
      commit({
        ...now,
        edges: now.edges.filter((edge) => edge.id !== selection.id),
      });
    setSelection(null);
  };

  const setShape = (shape: FlowShape) => {
    if (selection?.kind !== "node") return;
    const now = chartRef.current;
    commit({
      ...now,
      nodes: now.nodes.map((node) =>
        node.id === selection.id ? { ...node, shape } : node,
      ),
    });
  };

  const undo = () => {
    finishEditing();
    setPast((list) => {
      if (!list.length) return list;
      const previous = list[list.length - 1];
      setFuture((f) => [chartRef.current, ...f]);
      setChart(previous);
      chartRef.current = previous;
      return list.slice(0, -1);
    });
    setSelection(null);
  };

  const redo = () => {
    finishEditing();
    setFuture((list) => {
      if (!list.length) return list;
      const next = list[0];
      setPast((p) => [...p, chartRef.current]);
      setChart(next);
      chartRef.current = next;
      return list.slice(1);
    });
    setSelection(null);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest(".fce-text-input")) return;
    finishEditing();
    canvas.current?.focus({ preventScroll: true });
    const handle = target.closest<SVGElement>("[data-handle]");
    const point = toChart(e.clientX, e.clientY);
    const under = handle ? null : hit(point);
    if (under?.kind !== "edge")
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (handle) {
      setDrag({
        kind: "link",
        from: handle.dataset.handle!,
        side: handle.dataset.side as Side,
        to: point,
        moved: false,
      });
      return;
    }
    if (under?.kind === "node") {
      const id = under.id;
      const node = nodeById.get(id);
      if (!node) return;
      setSelection({ kind: "node", id });
      setDrag({
        kind: "move",
        id,
        from: { x: point.x - node.x, y: point.y - node.y },
        at: { x: node.x, y: node.y },
        before: chartRef.current,
        moved: false,
      });
      return;
    }
    if (under?.kind === "edge") {
      setSelection(under);
      return;
    }
    setSelection(null);
    setDrag({ kind: "pan", start: { x: e.clientX, y: e.clientY }, view });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    if (drag.kind === "pan") {
      setView({
        ...drag.view,
        x: drag.view.x + e.clientX - drag.start.x,
        y: drag.view.y + e.clientY - drag.start.y,
      });
      return;
    }
    const point = toChart(e.clientX, e.clientY);
    if (drag.kind === "link") {
      setDrag({ ...drag, to: point, moved: true });
      return;
    }
    const x = snap(point.x - drag.from.x);
    const y = snap(point.y - drag.from.y);
    const node = nodeById.get(drag.id);
    if (!node || (node.x === x && node.y === y)) return;
    const next = {
      ...chartRef.current,
      nodes: chartRef.current.nodes.map((n) =>
        n.id === drag.id ? { ...n, x, y } : n,
      ),
    };
    chartRef.current = next;
    setChart(next);
    if (!drag.moved) setDrag({ ...drag, moved: true });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const ended = drag;
    setDrag(null);
    if (!ended) return;
    if (ended.kind === "move") {
      if (ended.moved) {
        const after = chartRef.current;
        setPast((list) => [...list.slice(-99), ended.before]);
        setFuture([]);
        chartRef.current = after;
        onChange?.();
      }
      return;
    }
    if (ended.kind !== "link") return;
    const source = nodeById.get(ended.from);
    if (!source) return;
    const point = toChart(e.clientX, e.clientY);
    const over = ended.moved ? flowNodeAt(chartRef.current, point) : null;
    if (over && over.id !== source.id) {
      join(source.id, over.id);
      return;
    }
    if (over) return;
    const step = STEP[ended.side];
    const spot = ended.moved
      ? point
      : freeSpot(flowSpotBeside(source, step), step);
    addNode("box", spot, { id: source.id, side: ended.side });
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as Element;
    if (target.closest(".fce-text-input") || target.closest("[data-handle]"))
      return;
    const point = toChart(e.clientX, e.clientY);
    const under = hit(point);
    if (under) startEditing(under);
    else addNode("box", point, undefined);
  };

  const onWheel = (e: React.WheelEvent) => {
    const box = canvas.current?.getBoundingClientRect();
    if (!box) return;
    if (e.ctrlKey || e.metaKey) {
      const zoom = clampZoom(view.zoom * Math.exp(-e.deltaY * 0.01));
      const px = e.clientX - box.left;
      const py = e.clientY - box.top;
      setView({
        zoom,
        x: px - ((px - view.x) / view.zoom) * zoom,
        y: py - ((py - view.y) / view.zoom) * zoom,
      });
    } else setView({ ...view, x: view.x - e.deltaX, y: view.y - e.deltaY });
  };

  const zoomBy = (factor: number) => {
    const box = canvas.current?.getBoundingClientRect();
    if (!box) return;
    const zoom = clampZoom(view.zoom * factor);
    const px = box.width / 2;
    const py = box.height / 2;
    setView({
      zoom,
      x: px - ((px - view.x) / view.zoom) * zoom,
      y: py - ((py - view.y) / view.zoom) * zoom,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as Element).closest(".fce-text-input")) return;
    const mod = isMac() ? e.metaKey : e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (!selection) return;
    if (e.key === "Escape") {
      // Escape lets go of the picked box first, then closes.
      e.preventDefault();
      e.stopPropagation();
      setSelection(null);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeSelection();
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      startEditing(selection);
    } else if (selection.kind === "node" && e.key.startsWith("Arrow")) {
      e.preventDefault();
      const step = (e.shiftKey ? 5 : 1) * FLOW_GRID;
      const dx =
        e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      const now = chartRef.current;
      commit({
        ...now,
        nodes: now.nodes.map((n) =>
          n.id === selection.id ? { ...n, x: n.x + dx, y: n.y + dy } : n,
        ),
      });
    } else if (e.key === "Tab" && selection.kind === "node" && !e.shiftKey) {
      // Tab adds the next step under the picked one, as in outliners.
      e.preventDefault();
      addNode("box");
    }
  };

  const selectedNode =
    selection?.kind === "node" ? nodeById.get(selection.id) : undefined;
  const linkFrom = drag?.kind === "link" ? nodeById.get(drag.from) : undefined;
  const linkOver =
    drag?.kind === "link" && drag.moved ? flowNodeAt(chart, drag.to) : null;

  const editingBox = (() => {
    if (!editing) return null;
    if (editing.kind === "node") {
      const node = nodeById.get(editing.id);
      if (!node) return null;
      const box = flowNodeBox(node);
      const inset = node.shape === "diamond" ? 0.2 : 0.04;
      const w = box.right - box.left;
      const h = box.bottom - box.top;
      return {
        left: view.x + (box.left + w * inset) * view.zoom,
        top:
          view.y +
          (box.top + h * (node.shape === "diamond" ? 0.22 : 0.08)) * view.zoom,
        width: w * (1 - inset * 2) * view.zoom,
        height: h * (node.shape === "diamond" ? 0.56 : 0.84) * view.zoom,
      };
    }
    const edge = chart.edges.find((e) => e.id === editing.id);
    const from = edge && nodeById.get(edge.from);
    const to = edge && nodeById.get(edge.to);
    if (!from || !to) return null;
    const { start, end } = flowEdgeEnds(from, to);
    const width = 150 * view.zoom;
    const height = 44 * view.zoom;
    return {
      left: view.x + ((start.x + end.x) / 2) * view.zoom - width / 2,
      top: view.y + ((start.y + end.y) / 2) * view.zoom - height / 2,
      width,
      height,
    };
  })();

  return (
    <div className="fce">
      <div className="fce-toolbar" role="toolbar" aria-label={t("tools")}>
        {(["box", "diamond", "round"] as const).map((shape) => (
          <IconButton
            key={shape}
            size="sm"
            label={t(`add.${shape}`)}
            title={selectedNode ? t(`addAfter.${shape}`) : t(`add.${shape}`)}
            onClick={() => addNode(shape)}
          >
            {SHAPE_ICONS[shape]}
          </IconButton>
        ))}
        <span className="fce-divider" aria-hidden />
        {selectedNode && (
          <>
            <fieldset className="fce-shapes" aria-label={t("shapeLabel")}>
              {(["box", "diamond", "round"] as const).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  className="fce-shape"
                  aria-pressed={selectedNode.shape === shape}
                  title={t(`makeIt.${shape}`)}
                  onClick={() => setShape(shape)}
                >
                  {SHAPE_ICONS[shape]}
                  <span>{t(`shape.${shape}`)}</span>
                </button>
              ))}
            </fieldset>
            <span className="fce-divider" aria-hidden />
          </>
        )}
        {selection && (
          <IconButton
            size="sm"
            label={
              selection.kind === "node" ? t("deleteBox") : t("deleteArrow")
            }
            title={t("deleteWithKey", {
              what:
                selection.kind === "node" ? t("deleteBox") : t("deleteArrow"),
            })}
            onClick={removeSelection}
          >
            <Trash2 />
          </IconButton>
        )}
        <span className="flex-1" />
        <IconButton
          size="sm"
          label={tc("undo")}
          title={t("undoWithKey", { key: `${isMac() ? "⌘" : "Ctrl+"}Z` })}
          disabled={!past.length}
          onClick={undo}
        >
          <Undo2 />
        </IconButton>
        <IconButton
          size="sm"
          label={tc("redo")}
          title={t("redoWithKey", { key: isMac() ? "⇧⌘Z" : "Ctrl+Y" })}
          disabled={!future.length}
          onClick={redo}
        >
          <Redo2 />
        </IconButton>
        <IconButton
          size="sm"
          label={t("zoomOut")}
          title={t("zoomOut")}
          onClick={() => zoomBy(1 / 1.2)}
        >
          <ZoomOut />
        </IconButton>
        <IconButton
          size="sm"
          label={t("zoomIn")}
          title={t("zoomIn")}
          onClick={() => zoomBy(1.2)}
        >
          <ZoomIn />
        </IconButton>
        <IconButton size="sm" label={t("fit")} title={t("fit")} onClick={fit}>
          <Maximize />
        </IconButton>
      </div>
      <div
        ref={canvas}
        className={cn("fce-canvas", drag?.kind === "pan" && "is-panning")}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the canvas takes keys to move, write and delete
        tabIndex={0}
        role="application"
        aria-roledescription="flowchart"
        aria-describedby={descriptionId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        <p id={descriptionId} className="sr-only">
          {t("canvasHelp", {
            boxes: chart.nodes.length,
            arrows: chart.edges.length,
          })}
        </p>
        <svg
          className="fce-svg"
          style={{ ["--fce-zoom" as string]: view.zoom }}
          aria-hidden
        >
          <defs>
            <marker
              id="fce-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path className="fc-arrow" d="M0 0L10 5L0 10Z" />
            </marker>
            <marker
              id="fce-arrow-picked"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path className="fce-arrow-picked" d="M0 0L10 5L0 10Z" />
            </marker>
            <pattern
              id="fce-dots"
              width={20 * view.zoom}
              height={20 * view.zoom}
              x={view.x}
              y={view.y}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={1} cy={1} r={1} className="fce-dot" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fce-dots)" />
          <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            {chart.edges.map((edge) => {
              const from = nodeById.get(edge.from);
              const to = nodeById.get(edge.to);
              if (!from || !to) return null;
              const { start, end } = flowEdgeEnds(from, to);
              const picked =
                selection?.kind === "edge" && selection.id === edge.id;
              const isEditing =
                editing?.kind === "edge" && editing.id === edge.id;
              return (
                <g key={edge.id} data-edge={edge.id} className="fce-edge">
                  <line
                    className="fce-hit"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                  />
                  <line
                    className={cn("fc-edge", picked && "is-picked")}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    markerEnd={
                      picked ? "url(#fce-arrow-picked)" : "url(#fce-arrow)"
                    }
                  />
                  {edge.text && !isEditing && (
                    <EdgeLabel
                      text={edge.text}
                      x={(start.x + end.x) / 2}
                      y={(start.y + end.y) / 2}
                    />
                  )}
                </g>
              );
            })}
            {linkFrom && drag?.kind === "link" && drag.moved && (
              <line
                className="fce-link"
                x1={linkFrom.x}
                y1={linkFrom.y}
                x2={drag.to.x}
                y2={drag.to.y}
                markerEnd="url(#fce-arrow-picked)"
              />
            )}
            {chart.nodes.map((node) => {
              const picked =
                selection?.kind === "node" && selection.id === node.id;
              const isEditing =
                editing?.kind === "node" && editing.id === node.id;
              return (
                <g key={node.id} data-node={node.id} className="fce-node">
                  <path
                    className={cn(
                      "fc-node",
                      picked && "is-picked",
                      drag?.kind === "link" &&
                        linkOver?.id === node.id &&
                        node.id !== drag.from &&
                        "is-target",
                    )}
                    data-shape={node.shape}
                    d={flowNodePath(node)}
                  />
                  {!isEditing &&
                    flowTextLines(node).map(({ line, y }, i) => (
                      <text
                        key={i}
                        className="fc-text"
                        x={node.x}
                        y={y}
                        dy="0.35em"
                      >
                        {line}
                      </text>
                    ))}
                </g>
              );
            })}
            {selectedNode &&
              !drag &&
              SIDES.map((side) => {
                const box = flowNodeBox(selectedNode);
                const step = STEP[side];
                const cx =
                  selectedNode.x + step.x * ((box.right - box.left) / 2 + 14);
                const cy =
                  selectedNode.y + step.y * ((box.bottom - box.top) / 2 + 14);
                return (
                  <g
                    key={side}
                    data-handle={selectedNode.id}
                    data-side={side}
                    className="fce-handle"
                  >
                    <title>
                      Drag to a box to join them, or click for a new step
                    </title>
                    <circle cx={cx} cy={cy} r={14} className="fce-handle-hit" />
                    <circle cx={cx} cy={cy} r={7} className="fce-handle-dot" />
                    <path
                      d={`M${cx - 3.5} ${cy}H${cx + 3.5}M${cx} ${cy - 3.5}V${cy + 3.5}`}
                      className="fce-handle-plus"
                    />
                  </g>
                );
              })}
          </g>
        </svg>
        {editing && editingBox && (
          <textarea
            // biome-ignore lint/a11y/noAutofocus: writing starts as the box is made or double-clicked
            autoFocus
            className="fce-text-input"
            aria-label={
              editing.kind === "node" ? t("textInBox") : t("textOnArrow")
            }
            placeholder={editing.kind === "edge" ? t("edgeLabel") : undefined}
            style={{
              left: editingBox.left,
              top: editingBox.top,
              width: editingBox.width,
              height: editingBox.height,
              fontSize: `${14 * view.zoom}px`,
              lineHeight: `${FLOW_LINE_HEIGHT * view.zoom}px`,
            }}
            value={draft}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setDraft(e.target.value);
              editingRef.current = { editing, draft: e.target.value };
            }}
            onBlur={() => finishEditing()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                finishEditing(false);
                canvas.current?.focus({ preventScroll: true });
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                finishEditing();
                canvas.current?.focus({ preventScroll: true });
              } else if (
                e.key === "Tab" &&
                editing.kind === "node" &&
                !e.shiftKey
              ) {
                e.preventDefault();
                finishEditing();
                addNode("box");
              }
            }}
          />
        )}
        <p className="fce-hint" aria-hidden>
          Double-click to write or add a box · drag a dot to join boxes
        </p>
      </div>
    </div>
  );
});

FlowchartEditor.displayName = "FlowchartEditor";

function EdgeLabel({ text, x, y }: { text: string; x: number; y: number }) {
  const lines = flowEdgeLines(text);
  const longest = Math.max(...lines.map((line) => line.length));
  const width = longest * 7.4 + 12;
  const height = lines.length * FLOW_LINE_HEIGHT + 4;
  const first = y - ((lines.length - 1) * FLOW_LINE_HEIGHT) / 2;
  return (
    <>
      <rect
        className="fc-label-bg"
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
        rx={4}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          className="fc-label"
          x={x}
          y={first + i * FLOW_LINE_HEIGHT}
          dy="0.35em"
        >
          {line}
        </text>
      ))}
    </>
  );
}
