"use client";

import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { HTTPError } from "ky";
import {
  ArrowLeft,
  FingerprintPattern,
  KeyRound,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import {
  lastSignInProvider,
  useLogin,
  useOidcCallback,
  useOidcConfig,
  useOidcLogin,
  usePasskeyLogin,
  useRegistrationMode,
} from "@/features/auth";
import {
  AuthHeading,
  AuthMessage,
  AuthStatusScreen,
  linkButtonClass,
  OrDivider,
  PendingApprovalScreen,
} from "@/features/auth/components/auth-parts";
import { getSafeRedirectUrl } from "@/features/auth/utils/redirect";
import {
  isTwoStepRequired,
  serverSignInError,
  signInError,
} from "@/features/auth/utils/sign-in-error";
import { signInProviders } from "@/features/auth/utils/sign-in-providers";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { focusOnArrival } from "@/lib/platform";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const tc = useTranslations("common");
  const tAuth = useTranslations("auth");
  useDocumentTitle(t("documentTitle"));
  const searchParams = useSearchParams();
  const login = useLogin();
  const passkeyLogin = usePasskeyLogin();
  const oidc = useOidcConfig();
  const { initiate } = useOidcLogin();
  const oidcCallback = useOidcCallback();
  const registrationMode = useRegistrationMode();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const passwordRef = React.useRef<HTMLInputElement>(null);
  // Asked for once the password was right and two-step is on.
  const [needsCode, setNeedsCode] = React.useState(false);
  const [code, setCode] = React.useState("");
  const codeRef = React.useRef<HTMLInputElement>(null);
  const [canUsePasskey, setCanUsePasskey] = React.useState(false);
  React.useEffect(() => setCanUsePasskey(browserSupportsWebAuthn()), []);

  const providers = signInProviders(oidc.data);
  const providerName = oidc.data?.providerName || tAuth("providerFallback");
  const isProviderOnly =
    !!oidc.data?.enabled && !!oidc.data?.disableInternalAuth;
  const errorMessage =
    signInError(login.error, providerName) ??
    signInError(passkeyLogin.error, providerName);

  const signInWithProvider = (providerId?: string) => {
    const returnTo = getSafeRedirectUrl(searchParams.get("returnTo") || "/");
    initiate(returnTo !== "/" ? returnTo : undefined, providerId);
  };
  // A failed sign-in offers the provider it went to again.
  const retryProvider =
    providers.find((p) => p.id === lastSignInProvider()) ?? providers.at(0);
  const retryName = retryProvider?.name || providerName;

  if (oidcCallback.isProcessing)
    return (
      <p
        role="status"
        className="m-0 mt-3.5 flex items-center gap-2.5 text-lead text-muted-foreground [&_svg]:size-4.5"
      >
        <LoaderCircle aria-hidden className="animate-spin" />
        {t("signingYouIn")}
      </p>
    );

  const { failure } = oidcCallback;
  const isPending =
    errorMessage === "pending" ||
    (failure?.by === "server" && failure.code === "ACCOUNT_PENDING");
  if (failure && !isPending)
    return (
      <AuthStatusScreen
        illustration="callback"
        title={t("didntFinish")}
        text={
          failure.by === "provider"
            ? t("providerSentBack", {
                provider: retryName,
                providerOnly: isProviderOnly ? "yes" : "no",
              })
            : serverSignInError(failure.status, isProviderOnly)
        }
      >
        {failure.by === "provider" && (
          <p className="m-0 -mt-1.5 mb-1 text-muted-foreground text-small">
            {t("providerSaid", { provider: retryName })}{" "}
            <code className="rounded-[5px] bg-foreground/7 px-1.25 py-px font-mono text-foreground">
              {failure.message}
            </code>
          </p>
        )}
        <Button
          size="lg"
          className="w-full"
          onClick={() => signInWithProvider(retryProvider?.id)}
        >
          <KeyRound aria-hidden />
          {t("tryAgainWith", { provider: retryName })}
        </Button>
        <Button
          size="lg"
          variant="quiet"
          className="w-full"
          onClick={oidcCallback.clearFailure}
        >
          <ArrowLeft aria-hidden />
          {t("backToSignIn")}
        </Button>
      </AuthStatusScreen>
    );

  if (isPending)
    return (
      <PendingApprovalScreen
        onBack={() => {
          login.reset();
          passkeyLogin.reset();
          oidcCallback.clearFailure();
        }}
      />
    );

  return (
    <>
      <AuthHeading title={t("welcomeTitle")} sub={t("welcomeSub")} />
      {providers.length > 0 && (
        <>
          {providers.map((provider) => (
            <Button
              key={provider.id}
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={() => signInWithProvider(provider.id)}
            >
              <KeyRound aria-hidden />
              {t("continueWith", { provider: provider.name })}
            </Button>
          ))}
          {!isProviderOnly && <OrDivider />}
        </>
      )}
      {canUsePasskey && !isProviderOnly && !needsCode && (
        <>
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            busy={passkeyLogin.isPending && t("waitingForPasskey")}
            onClick={() => {
              login.reset();
              passkeyLogin.mutate();
            }}
          >
            <FingerprintPattern aria-hidden />
            {t("signInWithPasskey")}
          </Button>
          <OrDivider />
        </>
      )}
      {oidc.isError && (
        <AuthMessage
          action={
            <button
              type="button"
              className={`${linkButtonClass} self-center whitespace-nowrap`}
              onClick={() => oidc.refetch()}
            >
              {t("tryAgain")}
            </button>
          }
        >
          {t("optionsError")}
        </AuthMessage>
      )}
      {errorMessage && <AuthMessage>{errorMessage}</AuthMessage>}
      {!isProviderOnly && needsCode && (
        <form
          className="grid gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (login.isPending) return;
            login.mutate(
              { email: email.trim(), password, code: code.trim() },
              {
                onError: (error) => {
                  if (isTwoStepRequired(error)) {
                    setCode("");
                    codeRef.current?.focus();
                  }
                },
              },
            );
          }}
        >
          <Field label={t("codeLabel")} help={t("codeHelp")}>
            <Input
              ref={codeRef}
              autoFocus
              autoComplete="one-time-code"
              inputMode="text"
              spellCheck={false}
              value={code}
              required
              boxClassName="h-field-large"
              onChange={(e) => {
                setCode(e.target.value);
                if (login.error) login.reset();
              }}
            />
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            busy={login.isPending && t("signingIn")}
          >
            {t("signIn")}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="quiet"
            className="w-full"
            onClick={() => {
              setNeedsCode(false);
              setCode("");
              setPassword("");
              login.reset();
            }}
          >
            <ArrowLeft aria-hidden />
            {tc("back")}
          </Button>
        </form>
      )}
      {!isProviderOnly && !needsCode && (
        <form
          className="grid gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (login.isPending) return;
            passkeyLogin.reset();
            login.mutate(
              { email: email.trim(), password },
              {
                onError: (error) => {
                  if (isTwoStepRequired(error)) {
                    setNeedsCode(true);
                    return;
                  }
                  if (!(error instanceof HTTPError)) return;
                  if (error.response.status === 401) {
                    setPassword("");
                    passwordRef.current?.focus();
                  } else if (error.response.status === 403) void oidc.refetch();
                },
              },
            );
          }}
        >
          <Field label={t("email")}>
            <Input
              ref={focusOnArrival}
              type="email"
              autoComplete="email"
              value={email}
              required
              boxClassName="h-field-large"
              onChange={(e) => {
                setEmail(e.target.value);
                if (login.error) login.reset();
              }}
            />
          </Field>
          <Field label={t("password")}>
            <PasswordInput
              ref={passwordRef}
              autoComplete="current-password"
              value={password}
              required
              boxClassName="h-field-large"
              onChange={(e) => {
                setPassword(e.target.value);
                if (login.error) login.reset();
              }}
            />
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            busy={login.isPending && t("signingIn")}
          >
            {t("signIn")}
          </Button>
        </form>
      )}
      {!isProviderOnly &&
        !needsCode &&
        registrationMode.data?.mode !== "disabled" && (
          <p className="m-0 text-center text-muted-foreground text-ui">
            {t.rich("newToAnchor", {
              link: (chunks) => (
                <Link href="/register" className={linkButtonClass}>
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}
    </>
  );
}
