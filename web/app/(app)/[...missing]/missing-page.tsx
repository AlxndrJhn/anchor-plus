"use client";

import { NotebookPen, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppPage } from "@/components/layout/app-page";
import { ErrorScreen } from "@/components/layout/error-screen";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";

export default function MissingPage() {
  const t = useTranslations("layout.missingPage");
  useDocumentTitle(t("title"));
  return (
    <AppPage title={null}>
      <ErrorScreen
        illustration="missing"
        title={t("title")}
        text={t("text")}
        actions={
          <>
            <Button asChild>
              <Link href="/notes">
                <NotebookPen aria-hidden />
                {t("goToNotes")}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/notes?search=1">
                <Search aria-hidden />
                {t("searchNotes")}
              </Link>
            </Button>
          </>
        }
      />
    </AppPage>
  );
}
