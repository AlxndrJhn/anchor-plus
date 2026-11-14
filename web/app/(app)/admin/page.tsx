"use client";

import { useQuery } from "@tanstack/react-query";
import { Hash, NotebookPen, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { AppPage, PageTitle } from "@/components/layout/app-page";
import { Badge } from "@/components/ui/badge";
import { LoadFailedRow } from "@/components/ui/empty-state";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import {
  AdminGuard,
  adminKeys,
  getAdminStats,
  getPendingUsers,
  PeopleTab,
  SignInTab,
  StatCard,
} from "@/features/admin";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { useRetry } from "@/lib/hooks/use-retry";
import { useServerVersion } from "@/lib/hooks/use-server-version";

export default function AdminPage() {
  const t = useTranslations("admin.page");
  useDocumentTitle(t("title"));
  return (
    <AdminGuard>
      <AdminPageContent />
    </AdminGuard>
  );
}

function AdminPageContent() {
  const t = useTranslations("admin.page");
  const [tab, setTab] = React.useState<"people" | "signin">("people");
  const stats = useQuery({
    queryKey: adminKeys.stats,
    queryFn: getAdminStats,
  });
  const pending = useQuery({
    queryKey: adminKeys.pendingUsers,
    queryFn: getPendingUsers,
  });
  const statsRetry = useRetry(stats.refetch);
  const waitingCount = pending.data?.length ?? 0;
  const serverVersion = useServerVersion();

  return (
    <AppPage title={<PageTitle>{t("title")}</PageTitle>} scrollKey="admin">
      <div className="grid gap-4 pb-10">
        <div className="grid grid-cols-3 gap-3 max-md:gap-2">
          <StatCard
            icon={<Users />}
            label={t("people")}
            value={stats.data?.totalUsers}
            failed={stats.isError}
            caption={t("waitingCaption", { count: waitingCount })}
          />
          <StatCard
            icon={<NotebookPen />}
            label={t("notes")}
            value={stats.data?.totalNotes}
            failed={stats.isError}
            caption={t("includingTrash")}
          />
          <StatCard
            icon={<Hash />}
            label={t("tags")}
            value={stats.data?.totalTags}
            failed={stats.isError}
            caption={t("acrossPeople")}
          />
        </div>
        {((stats.isError && !stats.data) || statsRetry.isRetrying) && (
          <LoadFailedRow
            message={t("countsFailed")}
            onRetry={statsRetry.retry}
            isRetrying={statsRetry.isRetrying}
          />
        )}
        <p className="text-meta text-muted-foreground">
          {t("version", { version: process.env.NEXT_PUBLIC_APP_VERSION ?? "" })}
          {serverVersion &&
            ` · ${t("serverVersion", { version: serverVersion })}`}
        </p>
        <Tabs
          aria-label={t("title")}
          panelId="admin-panel"
          value={tab}
          onValueChange={setTab}
          tabs={[
            {
              value: "people",
              label: (
                <>
                  {t("people")}
                  {waitingCount > 0 && (
                    <Badge tone="warn">
                      {waitingCount}
                      <span className="sr-only"> {t("waiting")}</span>
                    </Badge>
                  )}
                </>
              ),
            },
            { value: "signin", label: t("signIn") },
          ]}
        />
        <TabPanel id="admin-panel" labelledBy={`admin-panel-tab-${tab}`}>
          <PeopleTab hidden={tab !== "people"} />
          <SignInTab hidden={tab !== "signin"} />
        </TabPanel>
      </div>
    </AppPage>
  );
}
