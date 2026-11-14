"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { QrImage } from "@/components/ui/qr-image";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";
import {
  type ApkRelease,
  fetchApkReleases,
  LATEST_APK_URL,
} from "../utils/apk-releases";
import { MagicLoginPanel } from "./magic-login-section";
import { Section } from "./settings-blocks";

type PhoneTab = "app" | "sign-in";
type Channel = "stable" | "candidate";

const PANEL_ID = "phone-panel";

/**
 * Connecting a phone, in the order it happens: download the Android app from
 * its GitHub release, then sign in to it with a magic login QR code.
 */
export function PhoneSection() {
  const t = useTranslations("settings.phone");
  const [tab, setTab] = React.useState<PhoneTab>("app");
  const tabs = [
    { value: "app", label: t("tabApp") },
    { value: "sign-in", label: t("tabSignIn") },
  ] as const;
  return (
    <Section id="phone" title={t("title")} description={t("description")}>
      <div className="px-4 pt-1.5 max-md:px-2.5">
        <Tabs
          value={tab}
          onValueChange={setTab}
          tabs={tabs}
          panelId={PANEL_ID}
          aria-label={t("title")}
          className="mb-0"
        />
      </div>
      <TabPanel id={PANEL_ID} labelledBy={`${PANEL_ID}-tab-${tab}`}>
        {tab === "app" ? <AppDownloadPanel /> : <MagicLoginPanel />}
      </TabPanel>
    </Section>
  );
}

function AppDownloadPanel() {
  const t = useTranslations("settings.phone");
  const [channel, setChannel] = React.useState<Channel>("stable");
  const releases = useQuery({
    queryKey: ["apk-releases"],
    queryFn: fetchApkReleases,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
  const candidate = releases.data?.candidate;
  const chosen: ApkRelease | null =
    channel === "candidate" && candidate
      ? candidate
      : (releases.data?.stable ?? null);
  // Without GitHub's answer, the newest stable release still has a link.
  const url = chosen?.url ?? LATEST_APK_URL;

  const copy = () =>
    copyText(url).then(
      () => toast.success(t("linkCopied")),
      () => toast.error(t("linkCopyFailed")),
    );

  return (
    <div className="flex flex-wrap items-start gap-6 px-5 py-4 max-md:p-3.5">
      <div className="w-44 flex-none max-md:mx-auto">
        <QrImage text={url} label={t("qrLabel")} />
      </div>
      <div className="grid min-w-50 flex-1 gap-3">
        <div className="grid gap-0.5">
          <b className="font-semibold text-ui">{t("downloadTitle")}</b>
          <span className="text-meta text-muted-foreground leading-[1.45]">
            {t("downloadText")}
          </span>
        </div>
        {candidate && (
          <SegmentedControl
            aria-label={t("release")}
            size="sm"
            value={channel}
            onValueChange={setChannel}
            options={[
              { value: "stable", label: t("latestRelease") },
              { value: "candidate", label: t("releaseCandidate") },
            ]}
          />
        )}
        <p
          role="status"
          className="m-0 text-meta text-muted-foreground leading-[1.45]"
        >
          {releases.isPending
            ? t("lookingUp")
            : chosen
              ? channel === "candidate" && candidate
                ? t("candidateVersion", { version: chosen.version })
                : t("version", { version: chosen.version })
              : t("newest")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" asChild>
            <a href={url} download>
              <Download aria-hidden />
              {t("downloadApk")}
            </a>
          </Button>
          <Button variant="secondary" onClick={copy}>
            <Link2 aria-hidden />
            {t("copyLink")}
          </Button>
        </div>
      </div>
    </div>
  );
}
