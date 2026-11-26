"use client";

import { useMutation } from "@tanstack/react-query";
import { HTTPError } from "ky";
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
import { Field, FormAlert } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { deleteAccount } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/store";
import { Row, RowText, Section } from "./settings-blocks";

/** Deleting one's own account, for good, after typing the password. */
export function DeleteAccountSection() {
  const t = useTranslations("settings.deleteAccount");
  const tc = useTranslations("common");
  const hasPassword = useAuthStore((s) => s.user?.hasPassword !== false);
  const clearAuth = useAuthStore((s) => s.logout);
  const [isOpen, setIsOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const passwordInput = React.useRef<HTMLInputElement>(null);

  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      clearAuth({ hasSignedOut: true });
      toast.success(t("deleted"));
    },
    onError: (e: Error) => {
      const status = e instanceof HTTPError ? e.response.status : 0;
      if (status === 403) {
        setPassword("");
        setPasswordError(t("wrongPassword"));
        passwordInput.current?.focus();
      } else if (status === 409) {
        setFormError(t("onlyAdmin"));
      } else {
        setFormError(t(status ? "failed" : "offline"));
      }
    },
  });

  React.useEffect(() => {
    if (!isOpen) return;
    setPassword("");
    setPasswordError(null);
    setFormError(null);
  }, [isOpen]);

  return (
    <Section id="delete-account" title={t("title")}>
      <Row>
        <RowText title={t("rowTitle")} text={t("rowText")} />
        <Button variant="danger" onClick={() => setIsOpen(true)}>
          {t("button")}
        </Button>
      </Row>
      <Dialog
        open={isOpen}
        onOpenChange={(next) => !remove.isPending && setIsOpen(next)}
      >
        <DialogContent
          alert
          showClose={false}
          onEscapeKeyDown={(e) => remove.isPending && e.preventDefault()}
        >
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              remove.mutate(hasPassword ? password : undefined);
            }}
          >
            <DialogHeader>
              <DialogTitle className="pr-0">{t("dialogTitle")}</DialogTitle>
              <DialogDescription>{t("dialogText")}</DialogDescription>
            </DialogHeader>
            {(hasPassword || formError) && (
              <DialogBody>
                {hasPassword && (
                  <Field
                    label={t("password")}
                    help={t("passwordHelp")}
                    error={passwordError}
                  >
                    <PasswordInput
                      ref={passwordInput}
                      value={password}
                      autoComplete="current-password"
                      autoFocus
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(null);
                      }}
                    />
                  </Field>
                )}
                {formError && <FormAlert>{formError}</FormAlert>}
              </DialogBody>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="quiet"
                onClick={() => setIsOpen(false)}
                disabled={remove.isPending}
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={hasPassword && !password}
                busy={remove.isPending && t("deleting")}
              >
                {t("button")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
