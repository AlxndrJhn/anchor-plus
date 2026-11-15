"use client";

import { useMutation } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { ArrowLeft, LogIn, Smartphone } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/features/auth";
import { redeemMagicLogin } from "@/features/auth/api";
import { AuthStatusScreen } from "@/features/auth/components/auth-parts";
import { androidIntentUrl, appLinkUrl } from "@/features/auth/utils/magic-link";
import { firstName } from "@/lib/utils";

const isAndroid = () =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

/**
 * Where Settings' magic link lands. On Android it opens the app, which
 * signs in with the code; anywhere, it can sign in this browser instead.
 */
export default function MagicLoginPage() {
  const t = useTranslations("auth.magicLogin");
  const code = useSearchParams().get("code") ?? "";
  const setAuth = useAuthStore((state) => state.setAuth);
  // Known only in the browser, after the first render.
  const [appUrl, setAppUrl] = React.useState<string | null>(null);
  const [isAndroidPhone, setIsAndroidPhone] = React.useState(false);

  // Straight into the app; this page stays for when it isn't installed.
  React.useEffect(() => {
    if (!code) return;
    const server = window.location.origin;
    if (!isAndroid()) {
      setAppUrl(appLinkUrl(code, server));
      return;
    }
    const url = androidIntentUrl(code, server);
    setIsAndroidPhone(true);
    setAppUrl(url);
    window.location.href = url;
  }, [code]);

  const signInHere = useMutation({
    mutationFn: () => redeemMagicLogin(code),
    onSuccess: (data) => {
      // GuestGuard navigates once signed in.
      if (data.access_token && data.refresh_token) {
        setAuth(data.user, data.access_token, data.refresh_token);
        toast.success(t("welcomeBack", { name: firstName(data.user.name) }));
      }
    },
  });

  const isUsedUp =
    signInHere.error instanceof HTTPError &&
    signInHere.error.response.status === 401;
  if (!code || isUsedUp)
    return (
      <AuthStatusScreen
        illustration="closed"
        title={t("expiredTitle")}
        text={t("expiredText")}
      >
        <Button size="lg" variant="secondary" className="w-full" asChild>
          <Link href="/login">
            <ArrowLeft aria-hidden />
            {t("signInWithPassword")}
          </Link>
        </Button>
      </AuthStatusScreen>
    );

  return (
    <AuthStatusScreen
      illustration="callback"
      title={t("title")}
      text={isAndroidPhone ? t("openingApp") : t("openOnPhone")}
    >
      {appUrl && isAndroidPhone && (
        <Button size="lg" className="w-full" asChild>
          <a href={appUrl}>
            <Smartphone aria-hidden />
            {t("openInApp")}
          </a>
        </Button>
      )}
      <Button
        size="lg"
        variant={isAndroidPhone ? "secondary" : "primary"}
        className="w-full"
        onClick={() => signInHere.mutate()}
        busy={signInHere.isPending && t("signingIn")}
      >
        <LogIn aria-hidden />
        {t("signInHere")}
      </Button>
      {signInHere.isError && !isUsedUp && (
        <p role="alert" className="m-0 text-late text-small">
          {t("signInFailed")}
        </p>
      )}
    </AuthStatusScreen>
  );
}
