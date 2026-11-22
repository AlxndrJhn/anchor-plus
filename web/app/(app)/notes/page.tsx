"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { useColumns } from "@/features/notes/hooks/use-columns";
import { NotesView } from "./notes-view";

export default function NotesPage() {
  const t = useTranslations("notes.notesPage");
  const tagId = useSearchParams().get("tagId");
  const isColumns = useColumns();
  // In columns the layout shows the list; this page is the empty side.
  if (isColumns)
    return (
      <EmptyState
        illustration="notes"
        title={t("noNoteOpen")}
        className="m-auto"
      >
        {t("noNoteOpenHelp")}
      </EmptyState>
    );
  // Next keeps the page mounted when only the tag changes.
  return <NotesView key={tagId ?? ""} tagId={tagId} />;
}
