"use client";

import { ArrowLeft, RotateCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppPage } from "@/components/layout/app-page";
import { ErrorScreen } from "@/components/layout/error-screen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  const t = useTranslations("noteEditor.states");
  return (
    <div className="pg-editor">
      <article
        className="note ed"
        data-note=""
        aria-busy="true"
        aria-label={t("loading")}
      >
        <div className="ed-scroll scrollbar-slim">
          <div className="ed-head">
            <Skeleton
              shape="circle"
              className="size-target-desktop rounded-button"
            />
          </div>
          <div className="note-in">
            <div className="grid gap-2">
              <Skeleton shape="title" className="h-8 w-[46%]" />
              <Skeleton style={{ width: "28%" }} />
              <span className="h-5" />
              {["96%", "88%", "92%", "58%", "84%", "70%"].map((w) => (
                <Skeleton key={w} style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

export function NoteLoadFailed({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("noteEditor.states");
  return (
    <AppPage title={null}>
      <ErrorScreen
        illustration="broken"
        title={t("loadFailedTitle")}
        text={t("loadFailedText")}
        actions={
          <>
            <Button onClick={onRetry}>
              <RotateCw aria-hidden />
              {t("tryAgain")}
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/notes">
                <ArrowLeft aria-hidden />
                {t("backToNotes")}
              </Link>
            </Button>
          </>
        }
      />
    </AppPage>
  );
}

export function NoteUnavailable() {
  const t = useTranslations("noteEditor.states");
  return (
    <AppPage title={null}>
      <ErrorScreen
        illustration="note"
        title={t("unavailableTitle")}
        text={t("unavailableText")}
        actions={
          <>
            <Button asChild>
              <Link href="/notes">
                <ArrowLeft aria-hidden />
                {t("backToNotes")}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/trash">
                <Trash2 aria-hidden />
                {t("openTrash")}
              </Link>
            </Button>
          </>
        }
      />
    </AppPage>
  );
}
