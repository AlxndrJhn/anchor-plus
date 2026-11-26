"use client";

import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { HTTPError } from "ky";
import {
  Copy,
  FingerprintPattern,
  KeyRound,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadFailedRow } from "@/components/ui/empty-state";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { QrImage } from "@/components/ui/qr-image";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  addPasskey,
  disableTwoStep,
  enableTwoStep,
  getSecurity,
  regenerateRecoveryCodes,
  removePasskey,
  setPasswordSignIn,
  startProviderLink,
  startTwoStep,
} from "@/features/auth/api";
import { useOidcConfig } from "@/features/auth/hooks/use-oidc";
import { useAuthStore } from "@/features/auth/store";
import type { Passkey } from "@/features/auth/types";
import { isPasskeyCancelled } from "@/features/auth/utils/sign-in-error";
import {
  isLinkedTo,
  signInProviders,
} from "@/features/auth/utils/sign-in-providers";
import { errorText } from "@/lib/api/error-code";
import { copyText } from "@/lib/clipboard";
import { useRetry } from "@/lib/hooks/use-retry";
import { dateLocale, translate } from "@/lib/i18n";
import { Row, RowText, Section } from "./settings-blocks";

const securityKey = ["auth-security"];

/** "Chrome on Windows", to tell passkeys apart. Stored with the passkey. */
function thisDeviceName() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Mac OS/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

const messageOf = (error: Error) =>
  error instanceof HTTPError
    ? error.message
    : translate("settings.security")("offline");

function passkeyUse(
  passkey: Passkey,
  t: ReturnType<typeof useTranslations<"settings.security">>,
) {
  const added = formatDistanceToNowStrict(new Date(passkey.createdAt), {
    locale: dateLocale(),
  });
  return passkey.lastUsedAt
    ? t("addedAndUsed", {
        added,
        used: formatDistanceToNowStrict(new Date(passkey.lastUsedAt), {
          locale: dateLocale(),
        }),
      })
    : t("added", { added });
}

export function SecuritySection() {
  const t = useTranslations("settings.security");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const security = useQuery({ queryKey: securityKey, queryFn: getSecurity });
  const retry = useRetry(security.refetch);
  const [canUsePasskey, setCanUsePasskey] = React.useState(true);
  React.useEffect(() => setCanUsePasskey(browserSupportsWebAuthn()), []);
  const [removing, setRemoving] = React.useState<Passkey | null>(null);
  const [twoStepDialog, setTwoStepDialog] = React.useState<
    "setup" | "disable" | "codes" | null
  >(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: securityKey });

  const add = useMutation({
    mutationFn: () => addPasskey(thisDeviceName()),
    onSuccess: () => {
      void refresh();
      toast.success(t("passkeyAdded"));
    },
    onError: (error: Error) => {
      if (isPasskeyCancelled(error)) return;
      toast.error(
        error.name === "InvalidStateError" ||
          (error.cause instanceof Error &&
            error.cause.name === "InvalidStateError")
          ? t("passkeyExists")
          : error instanceof HTTPError
            ? messageOf(error)
            : t("passkeyAddFailed"),
      );
    },
  });
  const remove = useMutation({
    mutationFn: (passkey: Passkey) => removePasskey(passkey.id),
    onSuccess: () => {
      setRemoving(null);
      void refresh();
      toast.success(t("passkeyRemoved"));
    },
    onError: (error: Error) => toast.error(messageOf(error)),
  });
  const passwordSignIn = useMutation({
    mutationFn: setPasswordSignIn,
    onSuccess: (status) => queryClient.setQueryData(securityKey, status),
    onError: (error: Error) => toast.error(messageOf(error)),
  });

  const oidc = useOidcConfig();
  const providers = signInProviders(oidc.data);
  const link = useMutation({
    mutationFn: startProviderLink,
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error: Error) => toast.error(messageOf(error)),
  });
  // Back from the provider after connecting.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("provider") === "connected";
    const failure = params.get("provider_error");
    const failureCode = params.get("error_code");
    if (!connected && failure === null) return;
    document.getElementById("set-security")?.scrollIntoView({ block: "start" });
    if (connected) toast.success(t("providerConnected"));
    else
      toast.error(
        errorText(failureCode) ?? (failure || t("providerConnectFailed")),
      );
    params.delete("provider");
    params.delete("provider_error");
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`,
    );
  }, [t]);

  const status = security.data;
  // Setting one up lifts the admin's reminder (or setup screen).
  const mergeUser = useAuthStore((s) => s.mergeUser);
  React.useEffect(() => {
    if (status && "secondFactor" in status)
      mergeUser({ secondFactor: status.secondFactor ?? null });
  }, [status, mergeUser]);

  return (
    <Section id="security" title={t("title")} description={t("description")}>
      {security.isError || retry.isRetrying ? (
        <Row>
          <LoadFailedRow
            className="flex-1"
            message={t("loadFailed")}
            onRetry={retry.retry}
            isRetrying={retry.isRetrying}
          />
        </Row>
      ) : !status ? (
        <Row className="grid gap-3" aria-busy="true">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </Row>
      ) : (
        <>
          {providers.map((provider) => {
            const linked = isLinkedTo(status, provider.id);
            const opening =
              (link.isPending || link.isSuccess) &&
              link.variables === provider.id;
            return (
              <Row key={provider.id}>
                <RowText
                  title={provider.name}
                  text={
                    linked
                      ? t("providerLinked", { provider: provider.name })
                      : t("providerLink", { provider: provider.name })
                  }
                />
                {!linked && (
                  <Button
                    variant="secondary"
                    onClick={() => link.mutate(provider.id)}
                    busy={opening && t("opening")}
                  >
                    <KeyRound aria-hidden />
                    {t("connect")}
                  </Button>
                )}
              </Row>
            );
          })}
          <Row>
            <RowText
              title={t("passkeys")}
              text={
                canUsePasskey ? t("passkeysText") : t("passkeysUnsupported")
              }
            />
            <Button
              variant="secondary"
              disabled={!canUsePasskey}
              onClick={() => add.mutate()}
              busy={add.isPending && t("waitingForDevice")}
            >
              <Plus aria-hidden />
              {t("addPasskey")}
            </Button>
          </Row>
          {status.passkeys.map((passkey) => (
            <Row key={passkey.id} className="py-3 max-md:py-3">
              <FingerprintPattern
                aria-hidden
                className="size-4.5 flex-none text-muted-foreground"
              />
              <RowText title={passkey.name} text={passkeyUse(passkey, t)} />
              <Button variant="quiet" onClick={() => setRemoving(passkey)}>
                {tc("remove")}
              </Button>
            </Row>
          ))}
          {status.hasPassword && (
            <Row>
              <RowText
                title={t("authenticator")}
                text={
                  status.twoStep
                    ? t("authenticatorOn", {
                        count: status.recoveryCodesLeft,
                      })
                    : t("authenticatorText")
                }
              />
              {status.twoStep ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setTwoStepDialog("codes")}
                  >
                    {t("newRecoveryCodes")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setTwoStepDialog("disable")}
                  >
                    {t("turnOff")}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setTwoStepDialog("setup")}
                >
                  <ShieldCheck aria-hidden />
                  {t("setUp")}
                </Button>
              )}
            </Row>
          )}
          {status.hasPassword && (
            <Row>
              <RowText
                title={
                  <label htmlFor="password-sign-in">
                    {t("passwordSignIn")}
                  </label>
                }
                text={
                  status.passkeys.length === 0
                    ? t("passwordSignInNeedsPasskey")
                    : status.passwordSignIn
                      ? t("passwordSignInOn")
                      : t("passwordSignInOff")
                }
              />
              <Switch
                id="password-sign-in"
                checked={status.passwordSignIn}
                disabled={
                  passwordSignIn.isPending ||
                  (status.passwordSignIn && status.passkeys.length === 0)
                }
                onCheckedChange={(on) => passwordSignIn.mutate(on)}
              />
            </Row>
          )}
        </>
      )}
      <ConfirmationDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("removeTitle")}
        description={t("removeText", { name: removing?.name ?? "" })}
        confirmLabel={tc("remove")}
        busyLabel={t("removing")}
        isPending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
      <TwoStepSetupDialog
        open={twoStepDialog === "setup"}
        onOpenChange={(open) => !open && setTwoStepDialog(null)}
        onDone={refresh}
      />
      <TwoStepCodeDialog
        open={twoStepDialog === "disable" || twoStepDialog === "codes"}
        mode={twoStepDialog === "codes" ? "codes" : "disable"}
        onOpenChange={(open) => !open && setTwoStepDialog(null)}
        onDone={refresh}
      />
    </Section>
  );
}

function RecoveryCodeList({ codes }: { codes: string[] }) {
  const t = useTranslations("settings.security");
  const copy = () =>
    copyText(codes.join("\n")).then(
      () => toast.success(t("codesCopied")),
      () => toast.error(t("codesCopyFailed")),
    );
  return (
    <div className="grid gap-3">
      <ul
        aria-label={t("recoveryCodes")}
        className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg bg-foreground/4 p-4 font-mono text-ui"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button variant="secondary" onClick={copy}>
        <Copy aria-hidden />
        {t("copyCodes")}
      </Button>
    </div>
  );
}

function TwoStepSetupDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations("settings.security");
  const tc = useTranslations("common");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const setup = useMutation({ mutationFn: startTwoStep });
  const enable = useMutation({
    mutationFn: enableTwoStep,
    onSuccess: onDone,
    onError: (e: Error) => {
      setCode("");
      setError(
        e instanceof HTTPError && e.response.status === 403
          ? t("wrongSetupCode")
          : messageOf(e),
      );
    },
  });

  // A fresh secret each time the dialog opens.
  const { mutate: startSetup, reset: resetSetup } = setup;
  const { reset: resetEnable } = enable;
  React.useEffect(() => {
    if (!open) return;
    setCode("");
    setError(null);
    resetEnable();
    resetSetup();
    startSetup();
  }, [open, startSetup, resetSetup, resetEnable]);

  const recoveryCodes = enable.data?.recoveryCodes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {recoveryCodes ? t("saveCodesTitle") : t("setupTitle")}
          </DialogTitle>
          <DialogDescription>
            {recoveryCodes ? t("saveCodesText") : t("setupText")}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {recoveryCodes ? (
            <RecoveryCodeList codes={recoveryCodes} />
          ) : setup.isError ? (
            <FormAlert>{messageOf(setup.error)}</FormAlert>
          ) : !setup.data ? (
            <Skeleton className="mx-auto aspect-square w-full max-w-64 rounded-lg" />
          ) : (
            <form
              id="two-step-setup"
              className="grid gap-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                enable.mutate(code.trim());
              }}
            >
              <QrImage text={setup.data.uri} label={t("qrLabel")} />
              <p className="m-0 text-center text-meta text-muted-foreground">
                {t.rich("cantScan", {
                  key: () => (
                    <code className="break-all font-mono text-foreground">
                      {setup.data.secret.replace(/(.{4})/g, "$1 ").trim()}
                    </code>
                  ),
                })}
              </p>
              <Field label={t("codeFromApp")} error={error}>
                <Input
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError(null);
                  }}
                />
              </Field>
            </form>
          )}
        </DialogBody>
        <DialogFooter>
          {recoveryCodes ? (
            <Button onClick={() => onOpenChange(false)}>{tc("done")}</Button>
          ) : (
            <>
              <Button variant="quiet" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                form="two-step-setup"
                disabled={!setup.data || code.replace(/\s/g, "").length < 6}
                busy={enable.isPending && t("turningOn")}
              >
                {t("turnOn")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TwoStepCodeDialog({
  open,
  mode,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  mode: "disable" | "codes";
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations("settings.security");
  const tc = useTranslations("common");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const submit = useMutation({
    mutationFn: async (value: string) => {
      if (mode === "codes")
        return (await regenerateRecoveryCodes(value)).recoveryCodes;
      await disableTwoStep(value);
      return null;
    },
    onSuccess: (codes) => {
      onDone();
      if (!codes) {
        onOpenChange(false);
        toast.success(t("turnedOff"));
      }
    },
    onError: (e: Error) => {
      setCode("");
      setError(
        e instanceof HTTPError && e.response.status === 403
          ? t("wrongCode")
          : messageOf(e),
      );
    },
  });
  const { reset } = submit;
  React.useEffect(() => {
    if (!open) return;
    setCode("");
    setError(null);
    reset();
  }, [open, reset]);

  const newCodes = submit.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {newCodes
              ? t("saveNewCodesTitle")
              : mode === "disable"
                ? t("disableTitle")
                : t("newCodesTitle")}
          </DialogTitle>
          <DialogDescription>
            {newCodes
              ? t("saveNewCodesText")
              : mode === "disable"
                ? t("disableText")
                : t("newCodesText")}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {newCodes ? (
            <RecoveryCodeList codes={newCodes} />
          ) : (
            <form
              id="two-step-code"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                submit.mutate(code.trim());
              }}
            >
              <Field label={t("code")} error={error}>
                <Input
                  autoFocus
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError(null);
                  }}
                />
              </Field>
            </form>
          )}
        </DialogBody>
        <DialogFooter>
          {newCodes ? (
            <Button onClick={() => onOpenChange(false)}>{tc("done")}</Button>
          ) : (
            <>
              <Button variant="quiet" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                form="two-step-code"
                variant={mode === "disable" ? "danger" : "primary"}
                disabled={!code.trim()}
                busy={
                  submit.isPending &&
                  (mode === "disable" ? t("turningOff") : t("makingCodes"))
                }
              >
                {mode === "disable" ? t("turnOff") : t("makeNewCodes")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
