"use client";

import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/toast";
import { useApplyLock, useUnlockedIds } from "../../hooks/use-note-lock";
import { lockableNotes } from "../../note-lock";
import type { Note } from "../../types";
import { LockDialog } from "./lock-dialog";

/**
 * Lock… for the notes picked. Notes still locked this session stay as they
 * are: a lock can only be changed once its note has been opened.
 */
export function BulkLockDialog({
  notes,
  open,
  onOpenChange,
  onDone,
}: {
  notes: Note[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations("noteEditor.lock.bulk");
  const applyLock = useApplyLock();
  const unlocked = useUnlockedIds();
  const { lockable, skipped } = lockableNotes(notes, unlocked);
  const kinds = new Set(lockable.map((n) => n.lock ?? null));
  const current = kinds.size === 1 ? [...kinds][0] : null;
  return (
    <LockDialog
      open={open}
      onOpenChange={onOpenChange}
      count={lockable.length || notes.length}
      current={current}
      onLock={async (kind) => {
        if (!lockable.length) {
          toast.info(t("alreadyLocked", { count: notes.length }));
          return;
        }
        await applyLock(lockable, kind);
        onDone();
        toast.success(
          skipped.length
            ? t("lockedSkipped", {
                count: lockable.length,
                skipped: skipped.length,
              })
            : t("locked", { count: lockable.length }),
        );
      }}
    />
  );
}
