"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Field } from "@/components/ui/field";
import { Input, InputButton, PasswordInput } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { Row, RowText } from "@/features/settings/components/settings-blocks";
import { translatedError } from "@/lib/api/error-code";
import { cn } from "@/lib/utils";
import {
  createOidcProvider,
  deleteOidcProvider,
  testOidcIssuer,
  updateOidcProvider,
} from "../api";
import { adminKeys } from "../queries";
import type {
  OidcProviderSettings,
  OidcSettings,
  UpdateOidcProviderDto,
} from "../types";
import { cardClass } from "./admin-parts";
import { CopyAddress } from "./copy-address";

/** The slug a provider's name suggests for its ID. */
export function slugOf(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/, "");
}

const ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

interface ProviderForm {
  id: string;
  name: string;
  enabled: boolean;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  clearSecret: boolean;
  mobileClientId: string;
}

const emptyForm: ProviderForm = {
  id: "",
  name: "",
  enabled: true,
  issuerUrl: "",
  clientId: "",
  clientSecret: "",
  clearSecret: false,
  mobileClientId: "",
};

async function messageOf(error: Error): Promise<string | undefined> {
  if (!(error instanceof HTTPError)) return undefined;
  const translated = translatedError(error);
  if (translated) return translated;
  try {
    const body = (await error.response.clone().json()) as {
      message?: string | string[];
    };
    return Array.isArray(body.message) ? body.message[0] : body.message;
  } catch {
    return undefined;
  }
}

function ProviderEditor({
  provider,
  takenIds,
  onDone,
}: {
  /** Undefined while adding one. */
  provider?: OidcProviderSettings;
  takenIds: string[];
  onDone: () => void;
}) {
  const t = useTranslations("admin.otherProviders");
  const ts = useTranslations("admin.singleSignOn");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const isNew = !provider;
  const [form, setForm] = React.useState<ProviderForm>(() =>
    provider
      ? {
          ...emptyForm,
          id: provider.id,
          name: provider.name,
          enabled: provider.enabled,
          issuerUrl: provider.issuerUrl ?? "",
          clientId: provider.clientId ?? "",
          mobileClientId: provider.mobileClientId ?? "",
        }
      : emptyForm,
  );
  const [idEdited, setIdEdited] = React.useState(false);
  const switchId = React.useId();
  const [errors, setErrors] = React.useState<{
    id?: string;
    issuer?: string;
    client?: string;
  }>({});
  const update = (patch: Partial<ProviderForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));
  const test = useMutation({
    mutationFn: testOidcIssuer,
    onError: () => toast.error(ts("testFailed")),
  });
  const testResult =
    test.variables === form.issuerUrl.trim() ? test.data : undefined;

  const save = useMutation({
    mutationFn: ({ id, ...dto }: UpdateOidcProviderDto & { id: string }) =>
      provider
        ? updateOidcProvider(provider.id, dto)
        : createOidcProvider({ id, ...dto }),
    onSuccess: (updated: OidcSettings) => {
      queryClient.setQueryData(adminKeys.oidc, updated);
      queryClient.invalidateQueries({ queryKey: ["oidc-config"] });
      toast.success(isNew ? t("added") : t("saved"));
      onDone();
    },
    onError: async (error: Error) =>
      toast.error(
        (await messageOf(error)) ?? (isNew ? t("addFailed") : t("saveFailed")),
      ),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = form.id.trim();
    const issuerUrl = form.issuerUrl.trim();
    const fieldErrors: typeof errors = {};
    if (isNew && !ID_PATTERN.test(id)) fieldErrors.id = t("idInvalid");
    else if (isNew && (id === "default" || takenIds.includes(id)))
      fieldErrors.id = t("idTaken");
    if (!/^https?:\/\/\S+$/i.test(issuerUrl))
      fieldErrors.issuer = ts("issuerInvalid");
    if (!form.clientId.trim()) fieldErrors.client = ts("clientRequired");
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    const dto: UpdateOidcProviderDto & { id: string } = {
      id,
      name: form.name.trim(),
      enabled: form.enabled,
      issuerUrl,
      clientId: form.clientId.trim(),
      mobileClientId: form.mobileClientId.trim(),
    };
    if (form.clientSecret.trim()) dto.clientSecret = form.clientSecret.trim();
    else if (form.clearSecret) dto.clientSecret = "";
    save.mutate(dto);
  };

  const hasSecret = !!provider?.hasClientSecret && !form.clearSecret;
  return (
    <form className="grid gap-3.5" noValidate onSubmit={submit}>
      <div className="grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1">
        <Field label={ts("providerName")} help={ts("providerNameHelp")}>
          <Input
            value={form.name}
            placeholder={t("namePlaceholder")}
            autoFocus
            onChange={(e) => {
              const name = e.target.value;
              update(
                isNew && !idEdited ? { name, id: slugOf(name) } : { name },
              );
            }}
          />
        </Field>
        <Field
          label={t("id")}
          error={errors.id}
          help={isNew ? t("idHelpNew") : t("idHelpFixed")}
        >
          <Input
            value={form.id}
            mono
            readOnly={!isNew}
            placeholder="work"
            onChange={(e) => {
              setIdEdited(true);
              update({ id: e.target.value.toLowerCase() });
              setErrors((prev) => ({ ...prev, id: undefined }));
            }}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1">
        <Field
          label={ts("issuerUrl")}
          error={
            errors.issuer ??
            (testResult && !testResult.ok && (
              <>
                {testResult.message}{" "}
                {testResult.issuer && (
                  <button
                    type="button"
                    className="cursor-pointer font-semibold underline underline-offset-2"
                    onClick={() => update({ issuerUrl: testResult.issuer })}
                  >
                    {ts("useIt")}
                  </button>
                )}
              </>
            ))
          }
          help={
            testResult?.ok
              ? testResult.supportsPkce
                ? ts("issuerFound", { issuer: testResult.issuer })
                : ts("issuerNoPkce", { issuer: testResult.issuer })
              : undefined
          }
        >
          <Input
            value={form.issuerUrl}
            inputMode="url"
            placeholder="https://sso.example.com/realms/staff"
            onChange={(e) => {
              update({ issuerUrl: e.target.value });
              setErrors((prev) => ({ ...prev, issuer: undefined }));
            }}
            end={
              form.issuerUrl.trim() && (
                <InputButton
                  disabled={test.isPending}
                  onClick={() => test.mutate(form.issuerUrl.trim())}
                >
                  {test.isPending ? ts("testing") : ts("test")}
                </InputButton>
              )
            }
          />
        </Field>
        <Field label={ts("clientId")} error={errors.client}>
          <Input
            value={form.clientId}
            onChange={(e) => {
              update({ clientId: e.target.value });
              setErrors((prev) => ({ ...prev, client: undefined }));
            }}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1">
        {hasSecret ? (
          <Field
            label={ts("clientSecret")}
            aside={ts("optional")}
            help={ts("secretNeverShown")}
          >
            <Input
              type="password"
              value={form.clientSecret}
              placeholder={ts("secretReplace")}
              onChange={(e) => update({ clientSecret: e.target.value })}
              end={
                <InputButton
                  onClick={() =>
                    update({ clientSecret: "", clearSecret: true })
                  }
                >
                  {ts("clear")}
                </InputButton>
              }
            />
          </Field>
        ) : (
          <Field
            label={ts("clientSecret")}
            aside={ts("optional")}
            help={t("secretHelp")}
          >
            <PasswordInput
              value={form.clientSecret}
              onChange={(e) => update({ clientSecret: e.target.value })}
            />
          </Field>
        )}
        <Field
          label={ts("phoneClientId")}
          aside={ts("optional")}
          help={t("phoneClientIdHelp")}
        >
          <Input
            value={form.mobileClientId}
            onChange={(e) => update({ mobileClientId: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Switch
          id={`${switchId}-on`}
          checked={form.enabled}
          onCheckedChange={(enabled) => update({ enabled })}
        />
        <label
          htmlFor={`${switchId}-on`}
          className="mr-auto font-semibold text-ui"
        >
          {t("showOnSignIn")}
        </label>
        <Button type="button" variant="quiet" onClick={onDone}>
          {tc("cancel")}
        </Button>
        <Button type="submit" busy={save.isPending && tc("saving")}>
          {isNew ? t("add") : tc("save")}
        </Button>
      </div>
    </form>
  );
}

/**
 * The sign-in providers after the first: each with its own button on the
 * sign-in page and its own callback URL.
 */
export function OtherProviders({
  providers,
}: {
  providers: OidcProviderSettings[];
}) {
  const t = useTranslations("admin.otherProviders");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<OidcProviderSettings | null>(
    null,
  );
  const remove = useMutation({
    mutationFn: (id: string) => deleteOidcProvider(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(adminKeys.oidc, updated);
      queryClient.invalidateQueries({ queryKey: ["oidc-config"] });
      setRemoving(null);
      toast.success(t("removed"));
    },
    onError: async (error: Error) =>
      toast.error((await messageOf(error)) ?? t("removeFailed")),
  });
  const takenIds = providers.map((p) => p.id);

  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-end gap-2.5 px-1">
        <div className="grid min-w-50 flex-1 gap-0.5">
          <h3 className="m-0 font-semibold text-ui">{t("title")}</h3>
          <p className="m-0 text-meta text-muted-foreground">
            {t("description")}
          </p>
        </div>
        {editing !== "" && (
          <Button variant="secondary" size="sm" onClick={() => setEditing("")}>
            <Plus aria-hidden />
            {t("addOne")}
          </Button>
        )}
      </div>
      {(providers.length > 0 || editing === "") && (
        <div
          data-slot="card"
          className={cn(cardClass, "[&>*+*]:border-border/55 [&>*+*]:border-t")}
        >
          {providers.map((provider) => (
            <Row key={provider.id} className="grid gap-3">
              {editing === provider.id ? (
                <ProviderEditor
                  provider={provider}
                  takenIds={takenIds}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <RowText
                      title={
                        <>
                          {provider.name}
                          {!provider.enabled && <Badge>{tc("off")}</Badge>}
                          {provider.source === "env" && (
                            <Badge>{t("fromServer")}</Badge>
                          )}
                        </>
                      }
                      text={provider.issuerUrl}
                    />
                    {provider.source === "database" && (
                      <>
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => setEditing(provider.id)}
                        >
                          {tc("edit")}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRemoving(provider)}
                        >
                          {tc("remove")}
                        </Button>
                      </>
                    )}
                  </div>
                  <CopyAddress
                    label={t("callbackUrl", { provider: provider.name })}
                    value={provider.callbackUrl}
                  />
                </>
              )}
            </Row>
          ))}
          {editing === "" && (
            <Row className="block">
              <ProviderEditor
                takenIds={takenIds}
                onDone={() => setEditing(null)}
              />
            </Row>
          )}
        </div>
      )}
      <ConfirmationDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
        title={t("removeTitle", { provider: removing?.name ?? "" })}
        description={t("removeDescription")}
        confirmLabel={tc("remove")}
        busyLabel={t("removing")}
        isPending={remove.isPending}
      />
    </div>
  );
}
