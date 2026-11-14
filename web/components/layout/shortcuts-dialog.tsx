"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Messages } from "@/lib/i18n";
import { isMac } from "@/lib/platform";

// A row: what it does (a message key), then its keys; a key list is one way of doing it.
type Shortcuts = Messages["layout"]["shortcuts"];
type Row = [keyof Shortcuts["rows"], string[][]];

const sections = (mod: string): [keyof Shortcuts["sections"], Row[]][] => [
  [
    "anywhere",
    [
      ["newNote", [["N"]]],
      ["search", [["/"], [mod, "K"]]],
      ["goToPage", [["G", "N / A / T / S"]]],
      ["goToTag", [["#"]]],
      ["toggleSidebar", [[mod, "\\"]]],
      ["thisDialog", [["?"]]],
    ],
  ],
  [
    "notes",
    [
      [
        "moveBetween",
        [
          ["↑", "↓", "←", "→"],
          ["H", "J", "K", "L"],
        ],
      ],
      [
        "firstOrLast",
        [
          ["G", "G"],
          ["Shift", "G"],
        ],
      ],
      ["open", [["Enter"], ["O"]]],
      ["select", [["X"], ["Space"]]],
      ["selectUpTo", [["Shift", "X"]]],
      ["newNoteOrList", [["C"], ["L"]]],
      ["leaveTag", [["Esc"]]],
    ],
  ],
  [
    "focused",
    [
      ["pin", [["F"]]],
      ["archive", [["E"]]],
      ["trash", [["Del"]]],
    ],
  ],
  [
    "inNote",
    [
      ["leaveText", [["Esc"]]],
      ["backIntoText", [["I"]]],
      ["closeOrTick", [[mod, "Enter"]]],
      ["pin", [["F"]]],
      ["archiveOne", [["E"]]],
      ["trashOne", [["Del"], ["#"]]],
    ],
  ],
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("layout.shortcuts");
  const mod = isMac() ? "⌘" : "Ctrl";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-5">
          {sections(mod).map(([section, rows]) => (
            <section key={section} className="grid gap-1.5">
              <h3 className="m-0 text-label text-muted-foreground uppercase">
                {t(`sections.${section}`)}
              </h3>
              <dl className="m-0 grid">
                {rows.map(([what, ways]) => (
                  <div
                    key={what}
                    className="flex items-center justify-between gap-4 border-border/50 border-b py-1.5 last:border-b-0"
                  >
                    <dt className="text-ui">{t(`rows.${what}`)}</dt>
                    <dd className="m-0 flex shrink-0 items-center gap-1.5 text-muted-foreground text-small">
                      {ways.map((keys, i) => (
                        <span
                          key={keys.join()}
                          className="flex items-center gap-1"
                        >
                          {i > 0 && <span>{t("or")}</span>}
                          {keys.map((key, j) => (
                            <kbd key={j}>{key}</kbd>
                          ))}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
