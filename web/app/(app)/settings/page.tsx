"use client";

import { AnchorLogo } from "@/components/layout/anchor-logo";
import { AppPage, PageTitle } from "@/components/layout/app-page";
import { LegalNotice } from "@/components/layout/legal-notice";
import {
  ApiTokenSection,
  AppearanceSection,
  DateTimeSection,
  DevicesSection,
  EditorSection,
  ImportExportSection,
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
  useDocumentTitle("Settings");
  // As in the Android app's About.
  const serverVersion = useServerVersion();
  return (
    <AppPage title={<PageTitle>Settings</PageTitle>} scrollKey="settings">
      <div className="grid grid-cols-[176px_minmax(0,640px)] items-start gap-10 pt-1 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-5">
        <SettingsNav />
        <div className="grid min-w-0 gap-8">
          <ProfileSection />
          <AppearanceSection />
          <DateTimeSection />
          <EditorSection />
          <QuickActionsSection />
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
          <Section id="about" title="About">
            <Row>
              <div className="flex items-center gap-3">
                <AnchorLogo className="size-10 rounded-md shadow-edge" />
                <div className="grid">
                  <b className="font-semibold text-ui">
                    Anchor+ {process.env.NEXT_PUBLIC_APP_VERSION}
                  </b>
                  <span className="text-meta text-muted-foreground">
                    Your thoughts, secured.
                  </span>
                  {appMode === "local" && (
                    <span className="text-meta text-muted-foreground">
                      Your notes are kept in this browser only.{" "}
                      <a
                        href={`${basePath}/demo/demos`}
                        className="font-semibold text-accent-ink underline decoration-current/35 underline-offset-3 hover:decoration-current"
                      >
                        Watch the feature demos
                      </a>
                    </span>
                  )}
                  {!isServerless && serverVersion && (
                    <span className="text-meta text-muted-foreground">
                      Server {serverVersion}
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
