"use client";

import { Archive, ArrowLeft, Lock, Pin } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { hasTitle } from "../../title";
import type { Note, NoteLockKind } from "../../types";
import { UnlockForm } from "./unlock-form";

/**
 * Stands in for a locked note until it is unlocked this session. It can
 * still be pinned and go to the archive without being unlocked.
 */
export function LockGate({
  note,
  onBack,
  onArchive,
  onTogglePin,
}: {
  note: Pick<Note, "id" | "title" | "background" | "isPinned"> & {
    lock: NoteLockKind;
  };
  onBack: () => void;
  /** Absent where the note can't be archived (already is, or trashed). */
  onArchive?: () => void;
  /** Absent where the note can't be pinned. */
  onTogglePin?: () => void;
}) {
  const t = useTranslations("noteEditor.lock.gate");
  const tc = useTranslations("common");
  const title = hasTitle(note.title) ? note.title : t("untitled");
  return (
    <div className="pg-editor">
      <article
        className="note ed"
        data-note={note.background ?? ""}
        aria-label={t("label")}
      >
        <div className="ed-scroll scrollbar-slim">
          <div className="ed-head">
            <div className="ed-head-l">
              <Tip label={tc("back")}>
                <IconButton label={tc("back")} onClick={onBack}>
                  <ArrowLeft />
                </IconButton>
              </Tip>
            </div>
            {(onTogglePin || onArchive) && (
              <div className="ed-head-r">
                {onTogglePin && (
                  <Tip label={note.isPinned ? t("unpin") : t("pin")}>
                    <IconButton
                      label={note.isPinned ? t("unpin") : t("pin")}
                      aria-pressed={note.isPinned}
                      onClick={onTogglePin}
                      className="aria-pressed:[&_svg]:fill-current"
                    >
                      <Pin />
                    </IconButton>
                  </Tip>
                )}
                {onArchive && (
                  <Tip label={tc("archive")}>
                    <IconButton label={tc("archive")} onClick={onArchive}>
                      <Archive />
                    </IconButton>
                  </Tip>
                )}
              </div>
            )}
          </div>
          <div className="lock-gate">
            <span className="lock-gate-icon" aria-hidden>
              <Lock />
            </span>
            <h1>{title}</h1>
            <p className="m-0 text-muted-foreground text-ui">{t("locked")}</p>
            <UnlockForm noteId={note.id} kind={note.lock} />
          </div>
        </div>
      </article>
    </div>
  );
}
