"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { getOidcSettings, testOidcIssuer, updateOidcSettings } from "../api";
import { adminKeys } from "../queries";
import type { OidcIssuerTest, UpdateOidcSettingsDto } from "../types";
import { cardClass, LockNote } from "./admin-parts";

const PHONE_CALLBACK_URL = "anchor://oidc/callback";

function CopyAddress({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <Input
      readOnly
      mono
      aria-label={label}
      value={value}
      boxClassName="bg-card"
      end={
        <InputButton
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() =>
            copyText(value).then(
              () => setCopied(true),
              () => toast.error("Couldn’t copy the address"),
            )
          }
        >
          {copied ? "Copied" : "Copy"}
        </InputButton>
      }
    />
  );
}

/** What to ask whoever runs the provider for, ready to paste in a message. */
function providerRequest(
  providerName: string,
  callbackUrl: string,
  postLogoutRedirectUrl: string,
  backchannelLogoutUrl: string,
) {
  return [
    `Could you add Anchor+ as an OIDC client in ${providerName}? In Pocket ID, that’s OIDC Clients → Add OIDC Client.`,
    "",
    "- Name: Anchor+",
    `- Callback URLs: ${callbackUrl}`,
    `  and ${PHONE_CALLBACK_URL} (for the phone app)`,
    `- Logout callback URL (post-logout redirect URI): ${postLogoutRedirectUrl}`,
    `- Back-channel logout URL, if it has one: ${backchannelLogoutUrl}`,
    "- Public client: yes, with PKCE (the phone app can’t keep a secret)",
    "",
    "Then send me its client ID and the issuer URL (your Pocket ID’s address). Thanks!",
  ].join("\n");
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
    | "providerLogout"
    | "logoutUrl"
  >
> & {
  clientSecret: string;
  clearSecret: boolean;
};

export function SingleSignOn({ isHidden = false }: { isHidden?: boolean }) {
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
            providerLogout: settings.providerLogout ?? true,
            logoutUrl: settings.logoutUrl ?? "",
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
    logout?: string;
  }>({});
  React.useEffect(() => setForm(saved), [saved]);
  const test = useMutation({
    mutationFn: testOidcIssuer,
    onError: () => toast.error("Couldn’t test the issuer URL"),
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
      toast.success("Single sign-on settings saved");
    },
    onError: (_, dto) =>
      toast.error("Couldn’t save single sign-on", {
        retry: () => save.mutate(dto),
      }),
  });

  if ((settingsQuery.isError && !settings) || settingsRetry.isRetrying)
    return (
      <section className="grid gap-2.5">
        <h2 className="m-0 px-1 text-title">Single sign-on</h2>
        <LoadFailedRow
          message="Couldn’t load the single sign-on settings."
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
  const providerName = form.providerName.trim() || "your provider";
  const hasSecret = settings.hasClientSecret && !form.clearSecret;

  const submit = () => {
    const fieldErrors: typeof errors = {};
    if (form.enabled && !form.issuerUrl.trim())
      fieldErrors.issuer = "Enter the issuer URL.";
    else if (form.enabled && !/^https?:\/\/\S+$/i.test(form.issuerUrl.trim()))
      fieldErrors.issuer = "Enter a full URL, like https://auth.example.com.";
    if (form.enabled && !form.clientId.trim())
      fieldErrors.client = "Enter the client ID.";
    if (
      form.logoutUrl.trim() &&
      !/^https?:\/\/\S+$/i.test(form.logoutUrl.trim())
    )
      fieldErrors.logout = "Enter a full URL, or leave it empty.";
    setErrors(fieldErrors);
    if (fieldErrors.issuer || fieldErrors.client || fieldErrors.logout) return;
    const dto: UpdateOidcSettingsDto = {
      enabled: form.enabled,
      providerName: form.providerName.trim(),
      issuerUrl: form.issuerUrl.trim(),
      clientId: form.clientId.trim(),
      mobileClientId: form.mobileClientId.trim(),
      disableInternalAuth: form.disableInternalAuth,
      providerLogout: form.providerLogout,
      logoutUrl: form.logoutUrl.trim(),
    };
    if (form.clientSecret.trim()) dto.clientSecret = form.clientSecret.trim();
    else if (form.clearSecret) dto.clearClientSecret = true;
    save.mutate(dto);
  };

  return (
    <section className="grid gap-2.5">
      <SectionHeader
        title="Single sign-on"
        description="Let people sign in with your identity provider, like Pocket ID or Authelia (OIDC)."
      />
      {locked && (
        <LockNote>
          Set by <code>OIDC_ENABLED</code>, <code>OIDC_ISSUER_URL</code> and{" "}
          <code>OIDC_CLIENT_ID</code> on the server. Remove them there to change
          these here.
        </LockNote>
      )}
      <div
        data-slot="card"
        className={cn(cardClass, "[&>*+*]:border-border/55 [&>*+*]:border-t")}
      >
        <Row>
          <div className="grid min-w-50 flex-1 gap-0.5">
            <label htmlFor="oidc-on" className="font-semibold text-ui">
              Sign in with a provider
            </label>
            <span className="text-meta text-muted-foreground">
              Adds a “Continue with {providerName}” button to the sign-in page.
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
                <Field
                  label="Provider name"
                  help="Shown on the sign-in button."
                >
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
                  label="Issuer URL"
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
                            Use it
                          </button>
                        )}
                      </>
                    ))
                  }
                  help={
                    testResult?.ok
                      ? testResult.supportsPkce
                        ? `Found ${testResult.issuer}.`
                        : `Found ${testResult.issuer}, but it doesn’t offer PKCE, which the phone app needs.`
                      : "Your provider’s address, like https://id.example.com for Pocket ID."
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
                          {test.isPending ? "Testing…" : "Test"}
                        </InputButton>
                      )
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1">
                <Field label="Client ID" error={errors.client}>
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
                    label="Client secret"
                    aside="Optional"
                    help="Set on the server."
                  >
                    <Input
                      readOnly
                      value=""
                      placeholder={settings.hasClientSecret ? "Saved" : "None"}
                    />
                  </Field>
                ) : hasSecret ? (
                  <Field
                    label="Client secret"
                    aside="Optional"
                    help="The saved secret is never shown."
                  >
                    <Input
                      type="password"
                      value={form.clientSecret}
                      placeholder="Saved. Type a new one to replace it."
                      onChange={(e) =>
                        updateForm({ clientSecret: e.target.value })
                      }
                      end={
                        <InputButton
                          onClick={() =>
                            updateForm({ clientSecret: "", clearSecret: true })
                          }
                        >
                          Clear
                        </InputButton>
                      }
                    />
                  </Field>
                ) : (
                  <Field
                    label="Client secret"
                    aside="Optional"
                    help={
                      form.mobileClientId.trim()
                        ? "Only used for web sign-in. The phone app has its own client below."
                        : "The Anchor+ phone app needs a public client, so leave this empty if people sign in from their phones, or give the phone app its own client below."
                    }
                  >
                    <PasswordInput
                      value={form.clientSecret}
                      placeholder={
                        form.mobileClientId.trim()
                          ? undefined
                          : "Leave empty for the phone app"
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
                  label="Phone app client ID"
                  aside="Optional"
                  help="For providers that give each client one sign-in method, like Logto: a public client just for the phone app, with its callback URL. Leave empty to use the client ID above."
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
                  Only sign in with {providerName}
                </label>
                <span className="text-meta text-muted-foreground">
                  Turns off sign-in and sign-up with email and password.
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
            <Row className="grid gap-3.5">
              <div className="flex items-center gap-3.5">
                <div className="grid min-w-50 flex-1 gap-0.5">
                  <label
                    htmlFor="oidc-logout"
                    className="font-semibold text-ui"
                  >
                    Sign out of {providerName} too
                  </label>
                  <span className="text-meta text-muted-foreground">
                    Signing out of Anchor+ on the web goes on to {providerName}
                    ’s sign-out, then back to the sign-in page.
                  </span>
                </div>
                <Switch
                  id="oidc-logout"
                  checked={form.providerLogout}
                  disabled={locked}
                  onCheckedChange={(providerLogout) =>
                    updateForm({ providerLogout })
                  }
                />
              </div>
              {form.providerLogout && (
                <div className="grid grid-cols-2 items-start gap-3.5 max-md:grid-cols-1">
                  <Field
                    label="Sign-out URL"
                    aside="Optional"
                    error={errors.logout}
                    help={`Leave empty to use the end_session_endpoint ${providerName} publishes.`}
                  >
                    <Input
                      value={form.logoutUrl}
                      readOnly={locked}
                      inputMode="url"
                      placeholder="From the provider’s discovery"
                      onChange={(e) => {
                        updateForm({ logoutUrl: e.target.value });
                        setErrors((prev) => ({ ...prev, logout: undefined }));
                      }}
                    />
                  </Field>
                </div>
              )}
            </Row>
            <Row className="block">
              <div className="grid gap-1.5 rounded-lg bg-muted px-3.5 py-3">
                <b className="font-semibold text-meta">Callback URLs</b>
                <CopyAddress
                  label="Web callback URL"
                  value={settings.callbackUrl}
                />
                <CopyAddress
                  label="Phone app callback URL"
                  value={PHONE_CALLBACK_URL}
                />
                <FieldDescription>
                  {form.mobileClientId.trim()
                    ? `In ${providerName}, add the first to the main client and the second to the phone app’s.`
                    : `Add both as callback URLs in ${providerName}.`}{" "}
                  The first is based on{" "}
                  <code className="rounded-[5px] bg-foreground/7 px-1.25 py-px font-mono text-foreground text-small">
                    APP_URL
                  </code>
                  . In Pocket ID, that’s OIDC Clients → Add OIDC Client; tick
                  Public Client and PKCE so the phone app can sign in too, and
                  copy its client ID here.
                </FieldDescription>
                <b className="mt-2 font-semibold text-meta">Sign-out URLs</b>
                <CopyAddress
                  label="Post-logout redirect URL"
                  value={settings.postLogoutRedirectUrl}
                />
                <CopyAddress
                  label="Back-channel logout URL"
                  value={settings.backchannelLogoutUrl}
                />
                <FieldDescription>
                  Add the first as a post-logout redirect URI (Logout Callback
                  URL in Pocket ID), so {providerName} sends people back after
                  signing out there. Give the second as the back-channel logout
                  URL, if {providerName} has one, so signing out there signs out
                  of Anchor+ too, on phones as well.
                </FieldDescription>
                <Button
                  variant="secondary"
                  size="sm"
                  className="justify-self-start"
                  onClick={() =>
                    copyText(
                      providerRequest(
                        providerName,
                        settings.callbackUrl,
                        settings.postLogoutRedirectUrl,
                        settings.backchannelLogoutUrl,
                      ),
                    ).then(
                      () =>
                        toast.success(
                          `Copied. Send it to whoever runs ${providerName}.`,
                        ),
                      () => toast.error("Couldn’t copy the request"),
                    )
                  }
                >
                  <Copy aria-hidden />
                  Copy a request for your {providerName} admin
                </Button>
              </div>
            </Row>
          </>
        )}
      </div>
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
          <span className="flex-1">
            You have unsaved changes to single sign-on.
          </span>
          <Button
            variant="quiet"
            size="sm"
            className="text-inherit hover:bg-inverse-foreground/10"
            onClick={() => {
              setForm(saved);
              setErrors({});
            }}
          >
            Discard
          </Button>
          <Button
            size="sm"
            className="bg-inverse-foreground bg-none text-inverse shadow-none hover:bg-inverse-foreground/90"
            onClick={submit}
            busy={save.isPending && "Saving…"}
          >
            Save
          </Button>
        </div>
      )}
    </section>
  );
}
