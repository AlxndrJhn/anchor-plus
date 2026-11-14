"use client";

import { Grid3x3, RectangleEllipsis } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { LoadFailedRow } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { SecretDialog } from "@/features/notes/components/lock/secret-dialog";
import { useNoteLockSecrets } from "@/features/notes/hooks/use-note-lock";
import { useRetry } from "@/lib/hooks/use-retry";
import { Row, RowText, Section } from "./settings-blocks";

/** The one PIN and one pattern that open the notes locked with them. */
export function NoteLocksSection() {
  const t = useTranslations("settings.noteLocks");
  const secrets = useNoteLockSecrets();
  const retry = useRetry(secrets.refetch);
  const [editing, setEditing] = React.useState<"pin" | "pattern" | null>(null);
  const rows = [
    {
      kind: "pin",
      icon: <RectangleEllipsis aria-hidden />,
      isSet: !!secrets.data?.pin,
    },
    {
      kind: "pattern",
      icon: <Grid3x3 aria-hidden />,
      isSet: !!secrets.data?.pattern,
    },
  ] as const;
  return (
    <Section id="locks" title={t("title")} description={t("description")}>
      {secrets.isError && !secrets.data ? (
        <Row>
          <LoadFailedRow
            className="flex-1"
            message={t("loadFailed")}
            onRetry={retry.retry}
            isRetrying={retry.isRetrying}
          />
        </Row>
      ) : secrets.isLoading ? (
        <Row aria-busy="true">
          <Skeleton className="h-4 w-1/2" />
        </Row>
      ) : (
        rows.map((row) => (
          <Row key={row.kind}>
            <RowText
              title={t("name", { kind: row.kind })}
              text={t(row.isSet ? "isSet" : "notSet", { kind: row.kind })}
            />
            <Button variant="secondary" onClick={() => setEditing(row.kind)}>
              {row.icon}
              {t(row.isSet ? "change" : "set", { kind: row.kind })}
            </Button>
          </Row>
        ))
      )}
      {editing && (
        <SecretDialog
          kind={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={() => toast.success(t("saved", { kind: editing }))}
        />
      )}
    </Section>
  );
}
