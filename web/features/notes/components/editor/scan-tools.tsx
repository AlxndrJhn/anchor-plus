"use client";

import { Download, Share2 } from "lucide-react";
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
import { toast } from "@/components/ui/toast";
import type { QuillDelta, QuillInstance } from "../../quill";
import {
  canSharePdf,
  detectCorners,
  downloadFile,
  scanPdf,
  sharePdf,
} from "../../scan-render";
import {
  attachmentShownIn,
  DEFAULT_PDF,
  encodeScan,
  newScanPage,
  parseScan,
  SCAN_EMBED,
  type ScanDocument,
} from "../../scans";
import { type InlinePictureHost, insertEmbedLines } from "./inline-image-tools";
import { ScanEditor, type ScanEditorHandle } from "./scan-editor";

export interface ScanToolsHandle {
  /** Chooses photos for a new scan, to put in the text at the caret. */
  add: () => void;
}

type BlotLookup = {
  scroll: { find: (node: Node) => unknown };
  getIndex: (blot: unknown) => number;
};

interface Open {
  scan: ScanDocument;
  /** The scan in the text being changed; null for a new one. */
  from: { node: HTMLElement; value: string } | null;
  at: number;
}

const asDelta = (delta: Delta) => delta as unknown as QuillDelta;

function valueAt(quill: QuillInstance, index: number): string | null {
  const [op] = quill.getContents(index, 1).ops;
  const insert = op?.insert;
  if (!insert || typeof insert !== "object") return null;
  const value = (insert as Record<string, unknown>)[SCAN_EMBED];
  return typeof value === "string" ? value : null;
}

/** Where the scan that was opened is now: others may have typed meanwhile. */
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
      (insert as Record<string, unknown>)[SCAN_EMBED] === from.value
    )
      return index;
    index += typeof insert === "string" ? insert.length : 1;
  }
  return -1;
}

/**
 * Scanned documents in the text: `add` takes photos for a new one; clicking
 * one opens it to change every page and the PDF; its PDF button downloads
 * it straight away. Saving writes it back where it was, as one undo step.
 */
export const ScanTools = React.forwardRef<
  ScanToolsHandle,
  {
    getQuill: () => QuillInstance | null;
    container: HTMLElement | null;
    host?: InlinePictureHost;
    /** Reads photos when there's no host (a read-only note). */
    load: (id: string) => Promise<Blob>;
    readOnly?: boolean;
  }
>(({ getQuill, container, host, load, readOnly }, ref) => {
  const t = useTranslations("editor.scan");
  const tc = useTranslations("common");
  const [open, setOpen] = React.useState<Open | null>(null);
  const [busy, setBusy] = React.useState<"pdf" | "share" | null>(null);
  const editor = React.useRef<ScanEditorHandle>(null);
  const changed = React.useRef(false);
  const input = React.useRef<HTMLInputElement>(null);
  const caret = React.useRef(0);
  const read = host?.load ?? load;

  const download = React.useCallback(
    async (scan: ScanDocument, share = false) => {
      if (!scan.pages.length) return;
      setBusy(share ? "share" : "pdf");
      try {
        const file = await scanPdf(scan, read);
        if (share) await sharePdf(file);
        else downloadFile(file);
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") toast.error(t("pdfFailed"));
      } finally {
        setBusy(null);
      }
    },
    [read, t],
  );

  React.useImperativeHandle(
    ref,
    () => ({
      add: () => {
        const quill = getQuill();
        if (!quill || !host) return;
        const range = quill.getSelection() ?? quill.selection.savedRange;
        caret.current = range
          ? range.index + range.length
          : quill.getLength() - 1;
        input.current?.click();
      },
    }),
    [getQuill, host],
  );

  const startNew = async (files: File[]) => {
    if (!host || !files.length) return;
    const toastId = toast.busy(t("addingPages"));
    try {
      const corners = await Promise.all(
        files.map((f) => detectCorners(f).catch(() => null)),
      );
      const ids = await host.upload(files);
      if (!ids.length) return;
      changed.current = true;
      setOpen({
        scan: {
          pages: ids.map((id, i) => newScanPage(id, corners[i] ?? undefined)),
          pdf: { ...DEFAULT_PDF },
        },
        from: null,
        at: caret.current,
      });
    } catch {
      toast.error(t("addFailed"));
    } finally {
      toast.dismiss(toastId);
    }
  };

  React.useEffect(() => {
    if (!container) return;
    const click = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const node = target?.closest?.<HTMLElement>(".ql-editor .scan");
      if (!node || e.button !== 0) return;
      const value = node.getAttribute("data-value") ?? "";
      const scan = parseScan(value);
      if (!scan) return;
      e.preventDefault();
      if (target?.closest(".scan-pdf")) {
        e.stopPropagation();
        void download(scan);
        return;
      }
      if (readOnly) return;
      changed.current = false;
      setOpen({ scan, from: { node, value }, at: 0 });
    };
    container.addEventListener("click", click);
    return () => container.removeEventListener("click", click);
  }, [container, download, readOnly]);

  const close = () => {
    changed.current = false;
    setOpen(null);
    getQuill()?.focus();
  };

  /** Deletes the photos of pages that were dropped, once nothing shows them. */
  const dropUnused = (
    quill: QuillInstance,
    before: ScanDocument,
    after: ScanDocument,
  ) => {
    if (!host) return;
    const kept = new Set(after.pages.map((p) => p.id));
    const ops = quill.getContents().ops;
    for (const id of new Set(before.pages.map((p) => p.id))) {
      if (!kept.has(id) && !attachmentShownIn(ops, id)) host.remove(id);
    }
  };

  const save = () => {
    const quill = getQuill();
    const scan = editor.current?.current();
    if (!quill || !open || !scan) return close();
    if (!scan.pages.length) return remove();
    const value = encodeScan(scan);
    if (!open.from) {
      insertEmbedLines(quill, open.at, [{ [SCAN_EMBED]: value }]);
      dropUnused(quill, open.scan, scan);
      changed.current = false;
      setOpen(null);
      return;
    }
    const index = locate(quill, open.from);
    if (index < 0) {
      const at = quill.getSelection()?.index ?? quill.getLength() - 1;
      insertEmbedLines(quill, at, [{ [SCAN_EMBED]: value }]);
    } else if (value !== open.from.value) {
      quill.history.cutoff();
      quill.updateContents(
        asDelta(
          new Delta()
            .retain(index)
            .insert({ [SCAN_EMBED]: value })
            .delete(1),
        ),
        "user",
      );
      quill.history.cutoff();
      quill.setSelection(index + 1, 0, "silent");
    }
    dropUnused(quill, open.scan, scan);
    close();
  };

  const remove = () => {
    const quill = getQuill();
    if (quill && open?.from) {
      const index = locate(quill, open.from);
      if (index >= 0) {
        const alone =
          (index === 0 || quill.getText(index - 1, 1) === "\n") &&
          quill.getText(index + 1, 1) === "\n";
        quill.history.cutoff();
        quill.deleteText(index, alone ? 2 : 1, "user");
        quill.history.cutoff();
        quill.setSelection(index, 0, "silent");
      }
    }
    // The photos stay attached until the note no longer shows them, so the
    // removal can still be undone; the strip shows them meanwhile.
    close();
  };

  const cancel = () => {
    // Photos added to a scan that's thrown away go too.
    const quill = getQuill();
    const current = editor.current?.current();
    if (quill && open && current)
      dropUnused(
        quill,
        current,
        open.from ? open.scan : { ...open.scan, pages: [] },
      );
    close();
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void startNew([...(e.currentTarget.files ?? [])]);
          e.currentTarget.value = "";
        }}
      />
      <Dialog open={!!open} onOpenChange={(next) => !next && cancel()}>
        <DialogContent
          size="lg"
          className="w-[min(1200px,100%)] max-md:h-[94dvh] md:h-[min(820px,calc(100dvh-48px))] grid-rows-[auto_1fr_auto]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (changed.current) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {open?.from ? t("editTitle") : t("newTitle")}
            </DialogTitle>
            <DialogDescription className="max-md:sr-only">
              {t("dialogHelp")}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="min-h-0">
            {open && (
              <ScanEditor
                key={open.from?.value ?? "new"}
                ref={editor}
                initial={open.scan}
                load={read}
                upload={host?.upload}
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
            <Button
              type="button"
              variant="secondary"
              aria-busy={busy === "pdf"}
              disabled={!!busy}
              onClick={() => {
                const scan = editor.current?.current();
                if (scan) void download(scan);
              }}
            >
              <Download /> {busy === "pdf" ? t("makingPdf") : t("downloadPdf")}
            </Button>
            {canSharePdf() && (
              <Button
                type="button"
                variant="secondary"
                aria-busy={busy === "share"}
                disabled={!!busy}
                onClick={() => {
                  const scan = editor.current?.current();
                  if (scan) void download(scan, true);
                }}
              >
                <Share2 /> {t("sharePdf")}
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={cancel}>
              {tc("cancel")}
            </Button>
            <Button type="button" onClick={save}>
              {open?.from ? tc("save") : t("addToNote")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

ScanTools.displayName = "ScanTools";
