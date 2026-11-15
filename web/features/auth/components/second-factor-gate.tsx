"use client";

import { useTranslations } from "next-intl";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toast";
import { SecuritySection } from "@/features/settings/components/security-section";
import { useAuth } from "../hooks/use-auth";

/**
 * After the admin's deadline, a password alone only lets people set up a
 * passkey or authenticator app. The app opens again once they have.
 */
export function SecondFactorGate({
  done,
  onContinue,
}: {
  /** They've set one up. */
  done: boolean;
  onContinue: () => void;
}) {
  const t = useTranslations("auth.secondFactorGate");
  const { logout } = useAuth();
  return (
    <div className="min-h-dvh overflow-auto bg-background text-foreground">
      <main className="mx-auto grid w-[min(640px,100%)] gap-6 px-4 py-10">
        <Brand className="justify-self-start" />
        <div className="grid gap-2">
          <h1 className="m-0 text-heading">
            {done ? t("doneTitle") : t("title")}
          </h1>
          <p className="m-0 text-muted-foreground">
            {done ? t("doneText") : t("text")}
          </p>
        </div>
        <SecuritySection />
        <div className="flex flex-wrap items-center gap-2">
          {done && <Button onClick={onContinue}>{t("goToNotes")}</Button>}
          <Button variant="quiet" onClick={() => void logout()}>
            {t("signOut")}
          </Button>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
