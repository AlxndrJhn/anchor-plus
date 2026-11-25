"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isMac } from "@/lib/platform";
import type { CommandId } from "../commands";
import {
  hasCommandModifier,
  normalizeChord,
  parseStroke,
  strokeForJson,
  strokeFromEvent,
} from "../keys";
import type { ActiveRule } from "../rules";
import { parseWhen } from "../when";
import { Keys } from "./keys-view";

export type RecordTarget =
  | { kind: "change"; rule: ActiveRule }
  | { kind: "add"; command: CommandId };

/** Keys pressed alone that work the dialog instead of being recorded. */
const SPECIAL = ["escape", "enter", "tab"] as const;

/**
 * Records a key combination, or a chord of two, as VS Code does: press the
 * keys, then Enter. Esc, Enter and Tab alone have buttons, since pressing
 * them works the dialog.
 */
export function RecordDialog({
  target,
  rules,
  onClose,
  onSave,
}: {
  target: RecordTarget | null;
  rules: ActiveRule[];
  onClose: () => void;
  onSave: (key: string, when: string | undefined) => void;
}) {
  const t = useTranslations("keybindings");
  const mac = isMac();
  const [strokes, setStrokes] = React.useState<string[]>([]);
  const [when, setWhen] = React.useState("");
  const command =
    target?.kind === "change" ? target.rule.command : target?.command;

  const catcher = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!target) return;
    setStrokes([]);
    setWhen(target.kind === "change" ? (target.rule.when ?? "") : "");
    // Ready for keys as soon as it opens.
    requestAnimationFrame(() => catcher.current?.focus());
  }, [target]);

  const chord = strokes.join(" ");
  const key = chord ? normalizeChord(chord, mac) : "";
  const conflicts = key
    ? rules.filter(
        (r) =>
          r.key === key && !(target?.kind === "change" && r === target.rule),
      )
    : [];
  const whenError = React.useMemo(() => {
    try {
      parseWhen(when);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [when]);
  const last = key ? parseStroke(key.split(" ").at(-1) ?? "", mac) : null;
  const add = (stroke: string) =>
    setStrokes((was) => (was.length >= 2 ? [stroke] : [...was, stroke]));
  const save = () => {
    if (key && !whenError) onSave(chord, when);
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {command
              ? t(`commands.${command as CommandId}`)
              : t("record.title")}
          </DialogTitle>
          <DialogDescription>{t("record.text")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="gap-4">
          {/* biome-ignore lint/a11y/useSemanticElements: a key catcher, not a text field */}
          <div
            role="textbox"
            tabIndex={0}
            aria-label={t("record.title")}
            aria-live="polite"
            ref={catcher}
            className="grid min-h-16 place-items-center rounded-lg bg-foreground/4 px-4 py-3 text-lead shadow-[inset_0_0_0_1px_var(--input)] focus-visible:shadow-[inset_0_0_0_2px_var(--ring)] focus-visible:outline-none"
            onKeyDown={(e) => {
              const plain =
                !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey;
              if (plain && (e.key === "Escape" || e.key === "Tab")) return;
              if (plain && e.key === "Enter") {
                e.preventDefault();
                save();
                return;
              }
              if (e.key === "Tab" && e.shiftKey && !e.ctrlKey && !e.altKey)
                return;
              const stroke = strokeFromEvent(e.nativeEvent);
              if (!stroke) return;
              e.preventDefault();
              e.stopPropagation();
              add(strokeForJson(stroke, mac));
            }}
          >
            {key ? (
              <Keys chord={key} mac={mac} />
            ) : (
              <span className="text-muted-foreground">
                {t("record.waiting")}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-meta text-muted-foreground">
            {SPECIAL.map((special) => (
              <Button
                key={special}
                variant="secondary"
                size="sm"
                onClick={() => add(special)}
              >
                <kbd className="font-sans">
                  {special === "escape"
                    ? "Esc"
                    : special[0].toUpperCase() + special.slice(1)}
                </kbd>
              </Button>
            ))}
            {strokes.length > 0 && (
              <Button variant="quiet" size="sm" onClick={() => setStrokes([])}>
                {t("record.clear")}
              </Button>
            )}
          </div>
          {last && !hasCommandModifier(last) && !/^f\d/.test(last.key) && (
            <p className="m-0 text-meta text-muted-foreground">
              {t("record.noModifier")}
            </p>
          )}
          {conflicts.length > 0 && (
            <div className="grid gap-1 text-meta">
              <span className="text-muted-foreground">
                {t("record.conflicts", { count: conflicts.length })}
              </span>
              <ul className="m-0 grid gap-0.5 pl-4">
                {conflicts.map((c) => (
                  <li key={`${c.command}-${c.when}`}>
                    {t(`commands.${c.command as CommandId}`)}
                    {c.when && (
                      <code className="ml-1.5 text-muted-foreground">
                        {c.when}
                      </code>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-1.5">
            <label
              htmlFor="record-when"
              className="font-semibold text-label text-muted-foreground uppercase"
            >
              {t("record.whenLabel")}
            </label>
            <Input
              id="record-when"
              mono
              size="sm"
              value={when}
              placeholder={t("row.whenPlaceholder")}
              aria-invalid={!!whenError}
              onChange={(e) => setWhen(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
            />
            {whenError && (
              <span className="text-destructive text-meta">{whenError}</span>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="quiet" onClick={onClose}>
            {t("record.cancel")}
          </Button>
          <Button disabled={!key || !!whenError} onClick={save}>
            {t("record.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
