"use client";

import { useTranslations } from "next-intl";
import { AnchorLogo } from "@/components/layout/anchor-logo";
import { AppPage, PageTitle } from "@/components/layout/app-page";
import { LegalNotice } from "@/components/layout/legal-notice";
import {
  ApiTokenSection,
  AppearanceSection,
  DateTimeSection,
  DeleteAccountSection,
  DevicesSection,
  EditorSection,
  ImportExportSection,
  KeyboardSection,
  LanguageSection,
  NoteLocksSection,
  PasswordSection,
  PhoneSection,
  ProfileSection,
  QuickActionsSection,
  Row,
  SearchSection,
  Section,
  SecuritySection,
  SettingsNav,
  StorageSection,
} from "@/features/settings";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { useServerVersion } from "@/lib/hooks/use-server-version";
import { appMode, basePath, isServerless } from "@/lib/local-backend/mode";

export default function SettingsPage() {
  const t = useTranslations("settings.page");
  useDocumentTitle(t("title"));
  // As in the Android app's About.
  const serverVersion = useServerVersion();
  return (
    <AppPage title={<PageTitle>{t("title")}</PageTitle>} scrollKey="settings">
      <div className="grid grid-cols-[176px_minmax(0,640px)] items-start gap-10 pt-1 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-5">
        <SettingsNav />
        <div className="grid min-w-0 gap-8">
          <ProfileSection />
          <AppearanceSection />
          <LanguageSection />
          <DateTimeSection />
          <EditorSection />
          <QuickActionsSection />
          <KeyboardSection />
          {!isServerless && <SearchSection />}
          {!isServerless && <ApiTokenSection />}
          {!isServerless && <StorageSection />}
          <ImportExportSection />
          <NoteLocksSection />
          {!isServerless && <SecuritySection />}
          {!isServerless && <PasswordSection />}
          {/* Just above Devices, where a phone that scans the code shows up. */}
          {!isServerless && <PhoneSection />}
          {!isServerless && <DevicesSection />}
          {!isServerless && <DeleteAccountSection />}
          <Section id="about" title={t("about")}>
            <Row>
              <div className="flex items-center gap-3">
                <AnchorLogo className="size-10 rounded-md shadow-edge" />
                <div className="grid">
                  <b className="font-semibold text-ui">
                    Anchor+ {process.env.NEXT_PUBLIC_APP_VERSION}
                  </b>
                  <span className="text-meta text-muted-foreground">
                    {t("tagline")}
                  </span>
                  {appMode === "local" && (
                    <span className="text-meta text-muted-foreground">
                      {t("localOnly")}{" "}
                      <a
                        href={`${basePath}/demo/demos`}
                        className="font-semibold text-accent-ink underline decoration-current/35 underline-offset-3 hover:decoration-current"
                      >
                        {t("watchDemos")}
                      </a>
                    </span>
                  )}
                  {!isServerless && serverVersion && (
                    <span className="text-meta text-muted-foreground">
                      {t("serverVersion", { version: serverVersion })}
                    </span>
                  )}
                </div>
              </div>
            </Row>
            <Row>
              <LegalNotice />
            </Row>
          </Section>
        </div>
      </div>
    </AppPage>
  );
}
