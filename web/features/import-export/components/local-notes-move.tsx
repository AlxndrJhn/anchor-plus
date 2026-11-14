"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { FieldDescription, FieldError } from "@/components/ui/field";
import { desktopLocalNotesMoved, takeDesktopLocalNotes } from "@/lib/desktop";
import { isServerless } from "@/lib/local-backend/mode";
import { cn } from "@/lib/utils";
import { useImport } from "../hooks/use-import";

/**
 * In the desktop app, after signing in: the notes kept on this computer
 * without a server move into the account, next to the notes already there.
 * Tags join the account's tags of the same name. A note already in the
 * account (from an earlier, stopped move) is skipped, so trying again never
 * makes copies.
 */
export function LocalNotesMove() {
  const t = useTranslations("settings.importExport.localMove");
  const tc = useTranslations("common");
  const importer = useImport();
  const { step, parsed, progress, report, runError, options } = importer;
  const { selectFiles, setOption, start } = importer;
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    if (isServerless) return;
    let isCancelled = false;
    takeDesktopLocalNotes()
      .then((file) => {
        if (!file || isCancelled) return;
        setIsActive(true);
        selectFiles([{ path: file.name, file }]);
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [selectFiles]);

  // Nothing worth moving: the built-in client had no notes.
  React.useEffect(() => {
    if (!isActive || !importer.pickError) return;
    setIsActive(false);
    void desktopLocalNotesMoved();
  }, [isActive, importer.pickError]);

  React.useEffect(() => {
    if (!isActive || step !== "preview") return;
    if (!options.skipExisting) setOption("skipExisting", true);
    else void start();
  }, [isActive, step, options.skipExisting, setOption, start]);

  // Kept for the next sign in when some didn't make it.
  React.useEffect(() => {
    if (report && !report.failed && !report.attachmentsFailed)
      void desktopLocalNotesMoved();
  }, [report]);

  const isRunning = step === "running" && !runError;
  const total = progress?.total ?? parsed?.notes.length ?? 0;
  const done = progress?.done ?? 0;

  return (
    <Dialog
      open={isActive && (step === "running" || step === "report")}
      onOpenChange={(open) => !open && !isRunning && setIsActive(false)}
    >
      <DialogContent
        size="md"
        showClose={!isRunning}
        onEscapeKeyDown={(e) => isRunning && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {report ? t("movedTitle") : t("movingTitle")}
          </DialogTitle>
          <DialogDescription>
            {report ? t("movedText") : t("movingText")}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="gap-2">
          {step === "running" && (
            <>
              <div className="flex justify-between font-medium text-control tabular-nums">
                <span>
                  {progress?.phase === "attachments"
                    ? t("uploadingAttachments", { done, total })
                    : t("movingNotes", { done, total })}
                </span>
                <span>{total ? Math.round((done / total) * 100) : 0}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={t("progress")}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={done}
                className="h-1.5 overflow-hidden rounded-xs bg-muted"
              >
                <div
                  className={cn(
                    "h-full rounded-xs bg-accent-strong transition-[width] duration-(--duration-slow) ease-standard",
                    runError && "bg-muted-foreground",
                  )}
                  style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                />
              </div>
              {runError ? (
                <FieldError>{runError}</FieldError>
              ) : (
                <FieldDescription>{t("keepOpen")}</FieldDescription>
              )}
            </>
          )}
          {report && (
            <FieldDescription>
              {t("notesMoved", { count: report.created + report.remapped })}
              {report.failed + report.attachmentsFailed > 0 &&
                ` ${t("itemsFailed", { count: report.failed + report.attachmentsFailed })}`}
            </FieldDescription>
          )}
        </DialogBody>
        <DialogFooter>
          {runError && (
            <Button onClick={importer.retry}>
              <RotateCw aria-hidden />
              {tc("retry")}
            </Button>
          )}
          {report && (
            <Button onClick={() => setIsActive(false)}>{tc("done")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
