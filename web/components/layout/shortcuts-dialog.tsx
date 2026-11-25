"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORIES, COMMANDS, useKeysFor } from "@/features/keybindings";
import { Keys } from "@/features/keybindings/components/keys-view";
import { isMac } from "@/lib/platform";

/** Every command that has a key now, as the user set them. */
export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("layout.shortcuts");
  const tk = useTranslations("keybindings");
  const keysFor = useKeysFor();
  const mac = isMac();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-5">
          {CATEGORIES.map((category) => {
            const rows = COMMANDS.filter(
              (c) => c.category === category && keysFor(c.id).length,
            );
            if (!rows.length) return null;
            return (
              <section key={category} className="grid gap-1.5">
                <h3 className="m-0 text-label text-muted-foreground uppercase">
                  {tk(`categories.${category}`)}
                </h3>
                <dl className="m-0 grid">
                  {rows.map((command) => (
                    <div
                      key={command.id}
                      className="flex items-center justify-between gap-4 border-border/50 border-b py-1.5 last:border-b-0"
                    >
                      <dt className="text-ui">
                        {tk(`commands.${command.id}`)}
                      </dt>
                      <dd className="m-0 flex shrink-0 flex-wrap items-center justify-end gap-1.5 text-muted-foreground text-small">
                        {keysFor(command.id).map((key, i) => (
                          <span key={key} className="flex items-center gap-1">
                            {i > 0 && <span>{t("or")}</span>}
                            <Keys chord={key} mac={mac} />
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
          <div>
            <Button asChild variant="secondary" size="sm">
              <Link
                href="/settings/shortcuts"
                onClick={() => onOpenChange(false)}
              >
                {t("customize")}
              </Link>
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
