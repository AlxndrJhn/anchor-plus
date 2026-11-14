"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useShellStore } from "@/components/layout/shell-store";
import { Button } from "@/components/ui/button";
import { LoadFailedRow } from "@/components/ui/empty-state";
import { Field, FieldDescription } from "@/components/ui/field";
import { Input, InputButton, PasswordInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  Row,
  SectionHeader,
} from "@/features/settings/components/settings-blocks";
import { copyText } from "@/lib/clipboard";
import { usePresence } from "@/lib/hooks/use-presence";
import { useRetry } from "@/lib/hooks/use-retry";
import { translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getOidcSettings, testOidcIssuer, updateOidcSettings } from "../api";
import { adminKeys } from "../queries";
import type { OidcIssuerTest, UpdateOidcSettingsDto } from "../types";
import { cardClass, LockNote } from "./admin-parts";
import { CopyAddress } from "./copy-address";
import { OtherProviders } from "./other-providers";

const PHONE_CALLBACK_URL = "anchor://oidc/callback";

/** What to ask whoever runs the provider for, ready to paste in a message. */
function providerRequest(providerName: string, callbackUrl: string) {
  return translate("admin.singleSignOn")("request", {
    provider: providerName,
    callbackUrl,
    phoneUrl: PHONE_CALLBACK_URL,
  });
}

type OidcForm = Required<
  Pick<
    UpdateOidcSettingsDto,
    | "enabled"
    | "providerName"
    | "issuerUrl"
    | "clientId"
    | "mobileClientId"
    | "disableInternalAuth"
  >
> & {
  clientSecret: string;
  clearSecret: boolean;
};

export function SingleSignOn({ isHidden = false }: { isHidden?: boolean }) {
  const t = useTranslations("admin.singleSignOn");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: adminKeys.oidc,
    queryFn: getOidcSettings,
  });
  const settingsRetry = useRetry(settingsQuery.refetch);
  const settings = settingsQuery.data;
  const saved = React.useMemo<OidcForm | null>(
    () =>
      settings
        ? {
            enabled: settings.enabled,
            providerName: settings.providerName ?? "",
            issuerUrl: settings.issuerUrl ?? "",
            clientId: settings.clientId ?? "",
            mobileClientId: settings.mobileClientId ?? "",
            disableInternalAuth: settings.disableInternalAuth,
            clientSecret: "",
            clearSecret: false,
          }
        : null,
    [settings],
  );
  const [form, setForm] = React.useState<OidcForm | null>(null);
  const [errors, setErrors] = React.useState<{
    issuer?: string;
    client?: string;
  }>({});
  React.useEffect(() => setForm(saved), [saved]);
  const test = useMutation({
    mutationFn: testOidcIssuer,
    onError: () => toast.error(t("testFailed")),
  });
  const testResult: OidcIssuerTest | undefined =
    test.variables === form?.issuerUrl.trim() ? test.data : undefined;

  const dirty =
    !!form &&
    !!saved &&
    (Object.keys(saved) as (keyof OidcForm)[]).some((key) =>
      key === "clientSecret"
        ? !!form.clientSecret.trim()
        : form[key] !== saved[key],
    );
  const saveBar = usePresence(dirty);
  const setBarShown = useShellStore((st) => st.setBarShown);
  React.useEffect(() => {
    setBarShown(dirty && !isHidden);
    return () => setBarShown(false);
  }, [dirty, isHidden, setBarShown]);

  const save = useMutation({
    mutationFn: (dto: UpdateOidcSettingsDto) => updateOidcSettings(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(adminKeys.oidc, updated);
      queryClient.invalidateQueries({ queryKey: ["oidc-config"] });
      toast.success(t("saved"));
    },
    onError: (_, dto) =>
      toast.error(t("saveFailed"), {
        retry: () => save.mutate(dto),
      }),
  });

  if ((settingsQuery.isError && !settings) || settingsRetry.isRetrying)
    return (
      <section className="grid gap-2.5">
        <h2 className="m-0 px-1 text-title">{t("title")}</h2>
        <LoadFailedRow
          message={t("loadFailed")}
          onRetry={settingsRetry.retry}
          isRetrying={settingsRetry.isRetrying}
        />
      </section>
    );
  if (settingsQuery.isLoading || !form || !settings)
    return (
      <section className="grid gap-2.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </section>
    );

  const locked = settings.isLocked;
  const updateForm = (patch: Partial<OidcForm>) =>
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  const providerName = form.providerName.trim() || t("providerFallback");
  const hasSecret = settings.hasClientSecret && !form.clearSecret;

  const submit = () => {
    const fieldErrors: typeof errors = {};
    if (form.enabled && !form.issuerUrl.trim())
      fieldErrors.issuer = t("issuerRequired");
    else if (form.enabled && !/^https?:\/\/\S+$/i.test(form.issuerUrl.trim()))
      fieldErrors.issuer = t("issuerInvalid");
    if (form.enabled && !form.clientId.trim())
      fieldErrors.client = t("clientRequired");
    setErrors(fieldErrors);
    if (fieldErrors.issuer || fieldErrors.client) return;
    const dto: UpdateOidcSettingsDto = {
      enabled: form.enabled,
      providerName: form.providerName.trim(),
      issuerUrl: form.issuerUrl.trim(),
      clientId: form.clientId.trim(),
      mobileClientId: form.mobileClientId.trim(),
      disableInternalAuth: form.disableInternalAuth,
    };
    if (form.clientSecret.trim()) dto.clientSecret = form.clientSecret.trim();
    else if (form.clearSecret) dto.clearClientSecret = true;
    save.mutate(dto);
  };

  return (
    <section className="grid gap-2.5">
      <SectionHeader title={t("title")} description={t("description")} />
      {locked && (
        <LockNote>
          {t.rich("locked", {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </LockNote>
      )}
      <div
        data-slot="card"
        className={cn(cardClass, "[&>*+*]:border-border/55 [&>*+*]:border-t")}
      >
        <Row>
          <div className="grid min-w-50 flex-1 gap-0.5">
            <label htmlFor="oidc-on" className="font-semibold text-ui">
              {t("enable")}
            </label>
            <span className="text-meta text-muted-foreground">
              {t("enableHelp", { provider: providerName })}
            </span>
          </div>
          <Switch
            id="oidc-on"
            checked={form.enabled}
            disabled={locked}
            onCheckedChange={(enabled) => updateForm({ enabled })}
          />
        </Row>
        {form.enabled && (
          <>
            <Row className="grid gap-3.5">
              <div className="grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1">
                <Field label={t("providerName")} help={t("providerNameHelp")}>
                  <Input
                    value={form.providerName}
                    placeholder="Pocket ID"
                    readOnly={locked}
                    onChange={(e) =>
                      updateForm({ providerName: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label={t("issuerUrl")}
                  error={
                    errors.issuer ??
                    (testResult && !testResult.ok && (
                      <>
                        {testResult.message}{" "}
                        {testResult.issuer && !locked && (
                          <button
                            type="button"
                            className="cursor-pointer font-semibold underline underline-offset-2"
                            onClick={() =>
                              updateForm({ issuerUrl: testResult.issuer })
                            }
                          >
                            {t("useIt")}
                          </button>
                        )}
                      </>
                    ))
                  }
                  help={
                    testResult?.ok
                      ? testResult.supportsPkce
                        ? t("issuerFound", { issuer: testResult.issuer })
                        : t("issuerNoPkce", { issuer: testResult.issuer })
                      : t("issuerHelp")
                  }
                >
                  <Input
                    value={form.issuerUrl}
                    readOnly={locked}
                    inputMode="url"
                    placeholder="https://id.example.com"
                    onChange={(e) => {
                      updateForm({ issuerUrl: e.target.value });
                      setErrors((prev) => ({ ...prev, issuer: undefined }));
                    }}
                    end={
                      form.issuerUrl.trim() && (
                        <InputButton
                          disabled={test.isPending}
                          onClick={() => test.mutate(form.issuerUrl.trim())}
                        >
                          {test.isPending ? t("testing") : t("test")}
                        </InputButton>
                      )
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1">
                <Field label={t("clientId")} error={errors.client}>
                  <Input
                    value={form.clientId}
                    readOnly={locked}
                    onChange={(e) => {
                      updateForm({ clientId: e.target.value });
                      setErrors((prev) => ({ ...prev, client: undefined }));
                    }}
                  />
                </Field>
                {locked ? (
                  <Field
                    label={t("clientSecret")}
                    aside={t("optional")}
                    help={t("secretOnServer")}
                  >
                    <Input
                      readOnly
                      value=""
                      placeholder={
                        settings.hasClientSecret ? t("secretSaved") : t("none")
                      }
                    />
                  </Field>
                ) : hasSecret ? (
                  <Field
                    label={t("clientSecret")}
                    aside={t("optional")}
                    help={t("secretNeverShown")}
                  >
                    <Input
                      type="password"
                      value={form.clientSecret}
                      placeholder={t("secretReplace")}
                      onChange={(e) =>
                        updateForm({ clientSecret: e.target.value })
                      }
                      end={
                        <InputButton
                          onClick={() =>
                            updateForm({ clientSecret: "", clearSecret: true })
                          }
                        >
                          {t("clear")}
                        </InputButton>
                      }
                    />
                  </Field>
                ) : (
                  <Field
                    label={t("clientSecret")}
                    aside={t("optional")}
                    help={
                      form.mobileClientId.trim()
                        ? t("secretWebOnly")
                        : t("secretPublicClient")
                    }
                  >
                    <PasswordInput
                      value={form.clientSecret}
                      placeholder={
                        form.mobileClientId.trim()
                          ? undefined
                          : t("secretEmptyForPhone")
                      }
                      onChange={(e) =>
                        updateForm({ clientSecret: e.target.value })
                      }
                    />
                  </Field>
                )}
              </div>
              <div className="grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1">
                <Field
                  label={t("phoneClientId")}
                  aside={t("optional")}
                  help={t("phoneClientIdHelp")}
                >
                  <Input
                    value={form.mobileClientId}
                    readOnly={locked}
                    onChange={(e) =>
                      updateForm({ mobileClientId: e.target.value })
                    }
                  />
                </Field>
              </div>
            </Row>
            <Row>
              <div className="grid min-w-50 flex-1 gap-0.5">
                <label htmlFor="oidc-only" className="font-semibold text-ui">
                  {t("only", { provider: providerName })}
                </label>
                <span className="text-meta text-muted-foreground">
                  {t("onlyHelp")}
                </span>
              </div>
              <Switch
                id="oidc-only"
                checked={form.disableInternalAuth}
                disabled={locked}
                onCheckedChange={(disableInternalAuth) =>
                  updateForm({ disableInternalAuth })
                }
              />
            </Row>
            <Row className="block">
              <div className="grid gap-1.5 rounded-lg bg-muted px-3.5 py-3">
                <b className="font-semibold text-meta">{t("callbackUrls")}</b>
                <CopyAddress
                  label={t("webCallback")}
                  value={settings.callbackUrl}
                />
                <CopyAddress
                  label={t("phoneCallback")}
                  value={PHONE_CALLBACK_URL}
                />
                <FieldDescription>
                  {form.mobileClientId.trim()
                    ? t("callbackHelpSplit", { provider: providerName })
                    : t("callbackHelpBoth", { provider: providerName })}{" "}
                  {t.rich("callbackHelpMore", {
                    code: (chunks) => (
                      <code className="rounded-[5px] bg-foreground/7 px-1.25 py-px font-mono text-foreground text-small">
                        {chunks}
                      </code>
                    ),
                  })}
                </FieldDescription>
                <Button
                  variant="secondary"
                  size="sm"
                  className="justify-self-start"
                  onClick={() =>
                    copyText(
                      providerRequest(providerName, settings.callbackUrl),
                    ).then(
                      () =>
                        toast.success(
                          t("requestCopied", { provider: providerName }),
                        ),
                      () => toast.error(t("requestCopyFailed")),
                    )
                  }
                >
                  <Copy aria-hidden />
                  {t("copyRequest", { provider: providerName })}
                </Button>
              </div>
            </Row>
          </>
        )}
      </div>
      {settings.providers && <OtherProviders providers={settings.providers} />}
      {saveBar.mounted && (
        <div
          role="status"
          data-slot="save-bar"
          inert={saveBar.leaving || undefined}
          onAnimationEnd={(e) =>
            e.target === e.currentTarget && saveBar.leaving && saveBar.done()
          }
          className={cn(
            "sticky bottom-3.5 z-(--z-sticky) flex items-center gap-2.5 rounded-xl bg-inverse py-2 pr-2 pl-4 text-control text-inverse-foreground shadow-bar",
            saveBar.leaving
              ? "pointer-events-none animate-rise-out"
              : "animate-rise-in",
          )}
        >
          <span className="flex-1">{t("unsaved")}</span>
          <Button
            variant="quiet"
            size="sm"
            className="text-inherit hover:bg-inverse-foreground/10"
            onClick={() => {
              setForm(saved);
              setErrors({});
            }}
          >
            {t("discard")}
          </Button>
          <Button
            size="sm"
            className="bg-inverse-foreground bg-none text-inverse shadow-none hover:bg-inverse-foreground/90"
            onClick={submit}
            busy={save.isPending && tc("saving")}
          >
            {tc("save")}
          </Button>
        </div>
      )}
    </section>
  );
}
