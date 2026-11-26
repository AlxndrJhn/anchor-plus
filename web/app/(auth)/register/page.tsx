"use client";

import { HTTPError } from "ky";
import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import {
  useOidcConfig,
  useOidcLogin,
  useRegister,
  useRegistrationMode,
} from "@/features/auth";
import {
  accountFieldHelp,
  NAME_MAX_LENGTH,
  refusedField,
} from "@/features/auth/account-fields";
import {
  AuthHeading,
  AuthMessage,
  AuthStatusScreen,
  linkButtonClass,
  OrDivider,
  PendingApprovalScreen,
} from "@/features/auth/components/auth-parts";
import { serverSignInError } from "@/features/auth/utils/sign-in-error";
import { signInProviders } from "@/features/auth/utils/sign-in-providers";
import { errorCodeOf } from "@/lib/api/error-code";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { focusOnArrival } from "@/lib/platform";

type Errors = {
  name?: string;
  email?: string;
  password?: string;
  form?: string;
};

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const tAuth = useTranslations("auth");
  useDocumentTitle(t("documentTitle"));
  const register = useRegister();
  const oidc = useOidcConfig();
  const { initiate } = useOidcLogin();
  const registrationMode = useRegistrationMode();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Errors>({});
  const nameRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const refs = { name: nameRef, email: emailRef, password: passwordRef };
  const providers = signInProviders(oidc.data);
  const providerName =
    providers.length > 1
      ? tAuth("providerAny")
      : oidc.data?.providerName || tAuth("providerFallback");
  const isProviderOnly =
    !!oidc.data?.enabled && !!oidc.data?.disableInternalAuth;

  const showRegisterError = (error: Error) => {
    const code = errorCodeOf(error);
    if (
      error instanceof HTTPError &&
      (error.response.status === 409 || code === "USER_EXISTS")
    ) {
      setErrors({
        email: t("emailTaken"),
      });
      refs.email.current?.focus();
    } else if (error instanceof HTTPError && error.response.status === 403) {
      void registrationMode.refetch();
      void oidc.refetch();
      if (code === "PASSWORD_SIGN_UP_DISABLED")
        setErrors({
          form: t("signUpWithProvider", { provider: providerName }),
        });
    } else if (!(error instanceof HTTPError))
      setErrors({
        form: serverSignInError(0),
      });
    else {
      const { status } = error.response;
      const field = refusedField(error);
      if (field) {
        setErrors({ [field]: accountFieldHelp(field) });
        refs[field].current?.focus();
      } else
        setErrors({
          form:
            status >= 500 || status === 429
              ? serverSignInError(status)
              : t("createFailed"),
        });
    }
  };

  if (registrationMode.data?.mode === "disabled")
    return (
      <AuthStatusScreen
        illustration="closed"
        title={t("closedTitle")}
        text={t("closedText")}
      >
        <Button size="lg" variant="secondary" className="w-full" asChild>
          <Link href="/login">
            <ArrowLeft aria-hidden />
            {t("backToSignIn")}
          </Link>
        </Button>
      </AuthStatusScreen>
    );

  if (register.isSuccess && !register.data?.access_token)
    return <PendingApprovalScreen />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (register.isPending) return;
    const fieldErrors: Errors = {};
    if (!name.trim()) fieldErrors.name = t("nameRequired");
    if (!/.+@.+\..+/.test(email.trim()))
      fieldErrors.email = accountFieldHelp("email");
    if (password.length < 8)
      fieldErrors.password = accountFieldHelp("password");
    setErrors(fieldErrors);
    const firstInvalid = (["name", "email", "password"] as const).find(
      (field) => fieldErrors[field],
    );
    if (firstInvalid) return refs[firstInvalid].current?.focus();
    register.reset();
    register.mutate(
      { name: name.trim(), email: email.trim(), password },
      { onError: showRegisterError },
    );
  };

  const clearError = (field: keyof Errors) =>
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));

  return (
    <>
      <AuthHeading
        title={t("title")}
        sub={
          registrationMode.data?.mode === "review" ? t("reviewSub") : t("sub")
        }
      />
      {providers.length > 0 && (
        <>
          {providers.map((provider) => (
            <Button
              key={provider.id}
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={() => initiate(undefined, provider.id)}
            >
              <KeyRound aria-hidden />
              {t("continueWith", { provider: provider.name })}
            </Button>
          ))}
          {!isProviderOnly && <OrDivider />}
        </>
      )}
      {errors.form && <AuthMessage>{errors.form}</AuthMessage>}
      {!isProviderOnly && (
        <form className="grid gap-3.5" noValidate onSubmit={submit}>
          <Field label={t("name")} error={errors.name}>
            <Input
              ref={(el) => {
                nameRef.current = el;
                focusOnArrival(el);
              }}
              autoComplete="name"
              placeholder={t("namePlaceholder")}
              maxLength={NAME_MAX_LENGTH}
              value={name}
              boxClassName="h-field-large"
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
            />
          </Field>
          <Field label={t("email")} error={errors.email}>
            <Input
              ref={refs.email}
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              boxClassName="h-field-large"
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
            />
          </Field>
          <Field
            label={t("password")}
            help={t("passwordHelp")}
            error={errors.password}
          >
            <PasswordInput
              ref={refs.password}
              autoComplete="new-password"
              value={password}
              boxClassName="h-field-large"
              onChange={(e) => {
                setPassword(e.target.value);
                clearError("password");
              }}
            />
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            busy={register.isPending && t("creating")}
          >
            {t("createAccount")}
          </Button>
        </form>
      )}
      <p className="m-0 text-center text-muted-foreground text-ui">
        {t.rich("haveAccount", {
          link: (chunks) => (
            <Link href="/login" className={linkButtonClass}>
              {chunks}
            </Link>
          ),
        })}
      </p>
    </>
  );
}
