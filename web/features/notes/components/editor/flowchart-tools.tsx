"use client";

import { useTranslations } from "next-intl";
import Delta from "quill-delta";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  encodeFlowchart,
  FLOWCHART_EMBED,
  type Flowchart,
  newFlowId,
  parseFlowchart,
  starterFlowchart,
} from "../../flowcharts";
import type { QuillDelta, QuillInstance } from "../../quill";
import {
  FlowchartEditor,
  type FlowchartEditorHandle,
} from "./flowchart-editor";
import { insertEmbedLines } from "./inline-image-tools";

export interface FlowchartToolsHandle {
  /** Opens a new flowchart, to put in the text at the caret. */
  add: () => void;
}

type BlotLookup = {
  scroll: { find: (node: Node) => unknown };
  getIndex: (blot: unknown) => number;
};

interface Open {
  chart: Flowchart;
  /** The chart in the text being changed; null for a new one. */
  from: { node: HTMLElement; value: string } | null;
  /** Where a new one goes. */
  at: number;
}

const asDelta = (delta: Delta) => delta as unknown as QuillDelta;

function valueAt(quill: QuillInstance, index: number): string | null {
  const [op] = quill.getContents(index, 1).ops;
  const insert = op?.insert;
  if (!insert || typeof insert !== "object") return null;
  const value = (insert as Record<string, unknown>)[FLOWCHART_EMBED];
  return typeof value === "string" ? value : null;
}

/** Where the chart that was opened is now: others may have typed meanwhile. */
function locate(quill: QuillInstance, from: NonNullable<Open["from"]>) {
  if (from.node.isConnected) {
    const lookup = quill as unknown as BlotLookup;
    const blot = lookup.scroll.find(from.node);
    const index = blot ? lookup.getIndex(blot) : -1;
    if (index >= 0 && valueAt(quill, index) !== null) return index;
  }
  let index = 0;
  for (const op of quill.getContents().ops) {
    const insert = op.insert;
    if (
      insert &&
      typeof insert === "object" &&
      (insert as Record<string, unknown>)[FLOWCHART_EMBED] === from.value
    )
      return index;
    index += typeof insert === "string" ? insert.length : 1;
  }
  return -1;
}

/**
 * Flowcharts in the text: `add` opens a new one; clicking one opens it to
 * change. Saving writes it back where it was, as one undo step.
 */
export const FlowchartTools = React.forwardRef<
  FlowchartToolsHandle,
  {
    getQuill: () => QuillInstance | null;
    container: HTMLElement | null;
  }
>(({ getQuill, container }, ref) => {
  const t = useTranslations("editorMedia.flowchart");
  const tc = useTranslations("common");
  const [open, setOpen] = React.useState<Open | null>(null);
  const editor = React.useRef<FlowchartEditorHandle>(null);
  /** Whether the open chart was changed: then only Cancel throws it away. */
  const changed = React.useRef(false);

  React.useImperativeHandle(
    ref,
    () => ({
      add: () => {
        const quill = getQuill();
        if (!quill) return;
        const at = quill.getSelection()?.index ?? quill.getLength() - 1;
        setOpen({ chart: starterFlowchart(newFlowId), from: null, at });
      },
    }),
    [getQuill],
  );

  React.useEffect(() => {
    if (!container) return;
    const click = (e: MouseEvent) => {
      const node = (e.target as Element | null)?.closest?.<HTMLElement>(
        ".ql-editor .flowchart",
      );
      if (!node || e.button !== 0) return;
      const value = node.getAttribute("data-value") ?? "";
      const chart = parseFlowchart(value);
      if (!chart) return;
      e.preventDefault();
      setOpen({ chart, from: { node, value }, at: 0 });
    };
    const key = (e: KeyboardEvent) => {
      // Enter with the caret just after a chart opens it, like a click.
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey) return;
      const quill = getQuill();
      const range = quill?.getSelection();
      if (!quill || !range || range.length || range.index < 1) return;
      const value = valueAt(quill, range.index - 1);
      const chart = value === null ? null : parseFlowchart(value);
      if (!chart) return;
      const [leaf] = (
        quill as unknown as {
          getLeaf: (i: number) => [{ domNode?: Node } | null, number];
        }
      ).getLeaf(range.index);
      const node = (leaf?.domNode as HTMLElement | undefined)?.closest?.(
        ".flowchart",
      ) as HTMLElement | null;
      if (!node) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen({ chart, from: { node, value: value! }, at: 0 });
    };
    container.addEventListener("click", click);
    container.addEventListener("keydown", key, true);
    return () => {
      container.removeEventListener("click", click);
      container.removeEventListener("keydown", key, true);
    };
  }, [container, getQuill]);

  const close = () => {
    changed.current = false;
    setOpen(null);
    getQuill()?.focus();
  };

  const save = () => {
    const quill = getQuill();
    const chart = editor.current?.current();
    if (!quill || !open || !chart) return close();
    if (!chart.nodes.length) return remove();
    const value = encodeFlowchart(chart);
    if (!open.from) {
      insertEmbedLines(quill, open.at, [{ [FLOWCHART_EMBED]: value }]);
      setOpen(null);
      return;
    }
    const index = locate(quill, open.from);
    if (index < 0) {
      // Gone from the text while open: put it back where the caret is.
      const at = quill.getSelection()?.index ?? quill.getLength() - 1;
      insertEmbedLines(quill, at, [{ [FLOWCHART_EMBED]: value }]);
    } else if (value !== open.from.value) {
      quill.history.cutoff();
      quill.updateContents(
        asDelta(
          new Delta()
            .retain(index)
            .insert({ [FLOWCHART_EMBED]: value })
            .delete(1),
        ),
        "user",
      );
      quill.history.cutoff();
      quill.setSelection(index + 1, 0, "silent");
    }
    close();
  };

  const remove = () => {
    const quill = getQuill();
    if (quill && open?.from) {
      const index = locate(quill, open.from);
      if (index >= 0) {
        // Its line goes too when the chart was all there was on it.
        const alone =
          (index === 0 || quill.getText(index - 1, 1) === "\n") &&
          quill.getText(index + 1, 1) === "\n";
        quill.history.cutoff();
        quill.deleteText(index, alone ? 2 : 1, "user");
        quill.history.cutoff();
        quill.setSelection(index, 0, "silent");
      }
    }
    close();
  };

  return (
    <Dialog open={!!open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        size="lg"
        className="w-[min(1100px,100%)] max-md:h-[92dvh] md:h-[min(780px,calc(100dvh-48px))] grid-rows-[auto_1fr_auto]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (changed.current) e.preventDefault();
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.querySelector<HTMLElement>(".fce-canvas")?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{open?.from ? t("edit") : t("new")}</DialogTitle>
          <DialogDescription className="max-md:sr-only">
            {t("help")}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="min-h-0">
          {open && (
            <FlowchartEditor
              key={open.from?.value ?? "new"}
              ref={editor}
              initial={open.chart}
              onChange={() => {
                changed.current = true;
              }}
            />
          )}
        </DialogBody>
        <DialogFooter>
          {open?.from && (
            <Button
              type="button"
              variant="danger"
              className="mr-auto max-md:mr-0"
              onClick={remove}
            >
              {t("removeFromNote")}
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={close}>
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={save}>
            {open?.from ? tc("save") : t("addToNote")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

FlowchartTools.displayName = "FlowchartTools";
