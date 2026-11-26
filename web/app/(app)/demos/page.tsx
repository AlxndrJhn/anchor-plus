"use client";

import { useTranslations } from "next-intl";
import { DemoList } from "@/components/demo/demo-list";
import { AppPage, PageTitle } from "@/components/layout/app-page";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { isDemo } from "@/lib/local-backend/mode";
import MissingPage from "../[...missing]/missing-page";

/** The demo build's feature demos, and the features it can't demo. */
export default function DemosPage() {
  const t = useTranslations("demos.page");
  useDocumentTitle(isDemo ? t("title") : undefined);
  if (!isDemo) return <MissingPage />;
  return (
    <AppPage title={<PageTitle>{t("title")}</PageTitle>} scrollKey="demos">
      <DemoList />
    </AppPage>
  );
}
