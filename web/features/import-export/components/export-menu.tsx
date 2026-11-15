"use client";

import { ChevronDown, Download, FileText, FolderArchive } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { translate } from "@/lib/i18n";
import { isServerless } from "@/lib/local-backend/mode";
import { downloadExport } from "../api";
import type { ExportFormat } from "../types";

const ALL_CHOICES = [
  { format: "anchor", icon: FolderArchive },
  { format: "markdown", icon: FileText },
] as const;

// The server writes the Markdown; without one there is only the backup.
const CHOICES = isServerless
  ? ALL_CHOICES.filter((choice) => choice.format === "anchor")
  : ALL_CHOICES;

function startExport(format: ExportFormat) {
  const t = translate("settings.exportMenu");
  void toast
    .promise(downloadExport(format), {
      loading: t("preparing"),
      success: t("downloaded"),
      error: t("failed"),
      retry: () => startExport(format),
    })
    .catch(() => {});
}

export function ExportMenu() {
  const t = useTranslations("settings.exportMenu");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">
          <Download aria-hidden />
          {t("export")}
          <ChevronDown aria-hidden className="-mr-1 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {CHOICES.map((choice) => (
          <DropdownMenuItem
            key={choice.format}
            className="items-start py-2 [&>svg]:mt-0.5"
            onSelect={() => startExport(choice.format)}
          >
            <choice.icon />
            <span className="grid gap-0.5 whitespace-normal leading-[1.35]">
              {t(`${choice.format}.label`)}
              <small className="text-muted-foreground text-small">
                {t(`${choice.format}.hint`)}
              </small>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
