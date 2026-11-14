"use client";

import {
  Fingerprint,
  Grid3x3,
  MousePointerClick,
  RectangleEllipsis,
} from "lucide-react";
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
import { FormAlert } from "@/components/ui/field";
import { RadioCards } from "@/components/ui/radio-cards";
import { useNoteLockSecrets } from "../../hooks/use-note-lock";
import { LOCK_KINDS } from "../../note-lock";
import type { NoteLockKind } from "../../types";
import { SecretDialog } from "./secret-dialog";

const ICON: Record<NoteLockKind, React.ReactNode> = {
  biometric: <Fingerprint aria-hidden />,
  pin: <RectangleEllipsis aria-hidden />,
  pattern: <Grid3x3 aria-hidden />,
  tap: <MousePointerClick aria-hidden />,
};

/**
 * Picks how a note (or the notes picked) lock. A PIN or pattern not set yet
 * is set first; one that is set needs no entering again.
 */
export function LockDialog({
  open,
  onOpenChange,
  current,
  count = 1,
  onLock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The note's lock now, when changing it. */
  current?: NoteLockKind | null;
  count?: number;
  /** Throws when it couldn't be locked. */
  onLock: (kind: NoteLockKind) => Promise<void>;
}) {
  const t = useTranslations("noteEditor.lock.dialog");
  const tc = useTranslations("common");
  const secrets = useNoteLockSecrets();
  const [kind, setKind] = React.useState<NoteLockKind>(current ?? "biometric");
  const [settingUp, setSettingUp] = React.useState<"pin" | "pattern" | null>(
    null,
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!open) return;
    setKind(current ?? "biometric");
    setError(null);
    setSettingUp(null);
  }, [open, current]);

  const lock = async (chosen: NoteLockKind) => {
    setBusy(true);
    setError(null);
    try {
      await onLock(chosen);
      onOpenChange(false);
    } catch {
      setError(navigator.onLine ? t("lockFailed") : t("lockOffline"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (kind === "pin" || kind === "pattern") {
      if (!secrets.data) {
        setError(t("setupOffline", { kind }));
        return;
      }
      if (!secrets.data[kind]) {
        setSettingUp(kind);
        return;
      }
    }
    void lock(kind);
  };

  const changing = !!current;
  return (
    <>
      <Dialog
        open={open && !settingUp}
        onOpenChange={(next) => !busy && onOpenChange(next)}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {changing ? t("changeTitle") : t("title")}
            </DialogTitle>
            <DialogDescription>{t("description", { count })}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <RadioCards
              aria-label={t("lockWith")}
              value={kind}
              onValueChange={setKind}
              className="grid-cols-2 max-md:grid-cols-1"
              options={LOCK_KINDS.map((k) => ({
                value: k.kind,
                label: k.label,
                description: k.description,
                icon: ICON[k.kind],
              }))}
            />
            {error && <FormAlert>{error}</FormAlert>}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="quiet"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {tc("cancel")}
            </Button>
            <Button onClick={confirm} busy={busy && t("locking")}>
              {changing ? t("changeTitle") : t("title")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {settingUp && (
        <SecretDialog
          kind={settingUp}
          open
          onOpenChange={(next) => !next && setSettingUp(null)}
          onSaved={() => {
            setSettingUp(null);
            void lock(settingUp);
          }}
        />
      )}
    </>
  );
}
