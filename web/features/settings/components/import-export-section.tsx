"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ExportMenu, ImportDialog } from "@/features/import-export";
import { Row, RowText, Section } from "./settings-blocks";

export function ImportExportSection() {
  const t = useTranslations("settings.importExportSection");
  const [importing, setImporting] = React.useState(false);
  return (
    <Section id="data" title={t("title")}>
      <Row>
        <RowText title={t("export")} text={t("exportText")} />
        <ExportMenu />
      </Row>
      <Row>
        <RowText title={t("import")} text={t("importText")} />
        <Button variant="secondary" onClick={() => setImporting(true)}>
          <Upload aria-hidden />
          {t("import")}
        </Button>
      </Row>
      <ImportDialog open={importing} onOpenChange={setImporting} />
    </Section>
  );
}
