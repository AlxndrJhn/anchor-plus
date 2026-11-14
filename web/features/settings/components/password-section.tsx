"use client";

import { useMutation } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { changePassword } from "@/features/auth/api";
import { useOidcConfig } from "@/features/auth/hooks/use-oidc";
import { useAuthStore } from "@/features/auth/store";
import { Row, RowText, Section } from "./settings-blocks";

export function PasswordSection() {
  const t = useTranslations("settings.password");
  const user = useAuthStore((s) => s.user);
  const oidc = useOidcConfig();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [currentPasswordError, setCurrentPasswordError] = React.useState<
    string | null
  >(null);
  const [newPasswordError, setNewPasswordError] = React.useState<string | null>(
    null,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const passwordChange = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast.success(t("changed"));
    },
    onError: (e: Error) => {
      const status = e instanceof HTTPError ? e.response.status : 0;
      if (status === 403) setCurrentPasswordError(t("wrongCurrent"));
      else if (status === 400 && /different/i.test(e.message))
        setNewPasswordError(t("mustDiffer"));
      else setFormError(t(status ? "changeFailed" : "offline"));
    },
  });

  const isProviderOnly =
    !!oidc.data?.enabled && !!oidc.data?.disableInternalAuth;
  if (user?.hasPassword === false || isProviderOnly) {
    const providerName = oidc.data?.providerName;
    const named = providerName ? "yes" : "no";
    return (
      <Section id="password" title={t("title")}>
        <Row>
          <RowText
            title={t("managedBy", { named, provider: providerName ?? "" })}
            text={t("changeIn", { named, provider: providerName ?? "" })}
          />
        </Row>
      </Section>
    );
  }

  return (
    <Section id="password" title={t("title")}>
      <Row className="block">
        <form
          className="grid gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (newPassword.length < 8)
              return setNewPasswordError(t("tooShort"));
            setFormError(null);
            passwordChange.mutate({ currentPassword, newPassword });
          }}
        >
          <div className="grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1">
            <Field label={t("current")} error={currentPasswordError}>
              <PasswordInput
                value={currentPassword}
                autoComplete="current-password"
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setCurrentPasswordError(null);
                }}
              />
            </Field>
            <Field
              label={t("new")}
              help={t("newHelp")}
              error={newPasswordError}
            >
              <PasswordInput
                value={newPassword}
                autoComplete="new-password"
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setNewPasswordError(null);
                }}
              />
            </Field>
          </div>
          {formError && <FormAlert>{formError}</FormAlert>}
          <div>
            <Button
              type="submit"
              disabled={!currentPassword || newPassword.length < 8}
              busy={passwordChange.isPending && t("changing")}
            >
              {t("change")}
            </Button>
          </div>
        </form>
      </Row>
    </Section>
  );
}
