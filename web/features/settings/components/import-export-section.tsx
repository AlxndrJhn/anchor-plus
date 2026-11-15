"use client";

import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  ExportMenu,
  ImportDialog,
  KeepDriveDialog,
} from "@/features/import-export";
import { getKeepDriveConfig } from "@/features/import-export/api";
import { Row, RowText, Section } from "./settings-blocks";

/** anchor-plus.app links here to start a move from Keep right away. */
const KEEP_DEEP_LINK = "google-keep";

export function ImportExportSection() {
  const [importing, setImporting] = React.useState(false);
  const [fromKeep, setFromKeep] = React.useState(false);
  const keepDrive = useQuery({
    queryKey: ["import", "google-keep", "config"],
    queryFn: getKeepDriveConfig,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const keepConfig = keepDrive.data?.enabled ? keepDrive.data : null;

  React.useEffect(() => {
    if (!keepConfig) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("import") !== KEEP_DEEP_LINK) return;
    setFromKeep(true);
    url.searchParams.delete("import");
    window.history.replaceState(null, "", url);
  }, [keepConfig]);

  return (
    <Section id="data" title="Import and export">
      <Row>
        <RowText
          title="Export"
          text="Download all your notes as a backup, or to move them to another app."
        />
        <ExportMenu />
      </Row>
      {keepConfig && (
        <Row>
          <RowText
            title="Move from Google Keep"
            text="Bring all your Keep notes over through your Google Drive, without downloading anything."
          />
          <Button variant="secondary" onClick={() => setFromKeep(true)}>
            Move from Keep
          </Button>
        </Row>
      )}
      <Row>
        <RowText
          title="Import"
          text="Import from an Anchor backup, Google Keep, or Markdown files from Obsidian and Nextcloud Notes."
        />
        <Button variant="secondary" onClick={() => setImporting(true)}>
          <Upload aria-hidden />
          Import
        </Button>
      </Row>
      <ImportDialog open={importing} onOpenChange={setImporting} />
      {keepConfig && (
        <KeepDriveDialog
          open={fromKeep}
          onOpenChange={setFromKeep}
          config={keepConfig}
        />
      )}
    </Section>
  );
}
