"use client";

import { LockOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import { checkUnlock, useNoteLockSecrets } from "../../hooks/use-note-lock";
import { unlockMethod, useUnlockedNotes } from "../../note-lock";
import type { NoteLockKind } from "../../types";
import { PatternPad } from "./pattern-pad";

/** What a locked note asks for before it opens: a tap, PIN, pattern or password. */
export function UnlockForm({
  noteId,
  kind,
  onUnlocked,
}: {
  noteId: string;
  kind: NoteLockKind;
  onUnlocked?: () => void;
}) {
  const t = useTranslations("noteEditor.lock.unlock");
  const secrets = useNoteLockSecrets();
  const method = unlockMethod(kind, secrets.data);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [shake, setShake] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = boxRef.current;
    if (!shake || !el) return;
    el.classList.remove("nudge");
    void el.offsetWidth;
    el.classList.add("nudge");
  }, [shake]);

  const unlock = () => {
    useUnlockedNotes.getState().unlock(noteId);
    onUnlocked?.();
  };

  const check = async (secret: string): Promise<boolean> => {
    if (method === "tap") return true;
    setBusy(true);
    setError(null);
    try {
      const ok = await checkUnlock(method, secret, secrets.data);
      if (ok) {
        unlock();
        return true;
      }
      setError(t(`wrong.${method}`));
      setShake((n) => n + 1);
      return false;
    } catch {
      setError(t("offline"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (method === "tap")
    return (
      <Button size="lg" autoFocus onClick={unlock}>
        <LockOpen aria-hidden />
        {t("tap")}
      </Button>
    );

  if (method === "pattern")
    return (
      <div ref={boxRef} className="unlock-box grid justify-items-center gap-2">
        <PatternPad
          label={t("yourPattern")}
          disabled={busy}
          onDone={(pattern) => check(pattern)}
        />
        <p
          role={error ? "alert" : undefined}
          className={
            error
              ? "m-0 font-medium text-destructive text-small"
              : "m-0 text-muted-foreground text-small"
          }
        >
          {error ?? t("drawPattern")}
        </p>
      </div>
    );

  const isPin = method === "pin";
  return (
    <form
      className="grid w-full max-w-72 gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value) return;
        if (!(await check(value))) setValue("");
      }}
    >
      <div ref={boxRef} className="unlock-box">
        <Field
          label={isPin ? t("pin") : t("password")}
          error={error}
          help={
            isPin
              ? undefined
              : kind === "biometric"
                ? t("biometricHelp")
                : undefined
          }
        >
          {isPin ? (
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={12}
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              mono
            />
          ) : (
            <PasswordInput
              autoComplete="current-password"
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
            />
          )}
        </Field>
      </div>
      <Button type="submit" disabled={!value} busy={busy && t("checking")}>
        <LockOpen aria-hidden />
        {t("unlock")}
      </Button>
    </form>
  );
}
