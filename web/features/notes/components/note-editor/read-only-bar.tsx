"use client";

import {
  Archive,
  ArchiveRestore,
  CloudOff,
  Lock,
  RotateCcw,
  Snowflake,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/features/preferences";
import { useRovingFocus } from "@/lib/hooks/use-roving-focus";
import { cn } from "@/lib/utils";
import type { Person } from "./note-editor-content";

type ReadOnlyBarProps =
  | {
      kind: "trash";
      deletesOn: Date;
      onRestore: () => void;
      onDelete: () => void;
      restoring?: boolean;
    }
  | { kind: "view"; sharedBy: Person }
  | { kind: "archived"; onUnarchive: () => void }
  | { kind: "frozen"; onUnfreeze?: () => void }
  | { kind: "refused" }
  | { kind: "offline" };

/** A new `nudge` number shakes it. */
export function ReadOnlyBar(props: ReadOnlyBarProps & { nudge?: number }) {
  const t = useTranslations("noteEditor.readOnly");
  const ref = React.useRef<HTMLDivElement>(null);
  const actions = useRovingFocus<HTMLSpanElement>();
  React.useEffect(() => {
    const el = ref.current;
    if (!props.nudge || !el) return;
    el.classList.remove("nudge", "flash");
    void el.offsetWidth;
    el.classList.add("nudge", "flash");
    const timer = window.setTimeout(() => el.classList.remove("flash"), 700);
    return () => window.clearTimeout(timer);
  }, [props.nudge]);

  const icon = (node: React.ReactNode) => (
    <span className="ic" aria-hidden>
      {node}
    </span>
  );
  return (
    <div
      ref={ref}
      role="status"
      className={cn("ro-bar")}
      onAnimationEnd={() => ref.current?.classList.remove("nudge")}
    >
      {props.kind === "trash" && (
        <>
          {icon(<Trash2 />)}
          <span className="ro-msg">
            {t.rich("trash", {
              b: (chunks) => <b>{chunks}</b>,
              date: formatShortDate(props.deletesOn).replace(/\.$/, ""),
            })}
          </span>
          <span
            ref={actions.ref}
            className="ro-acts"
            role="toolbar"
            aria-label={t("trashLabel")}
            onFocus={actions.onFocus}
            onKeyDown={actions.onKeyDown}
          >
            <Button
              onClick={props.onRestore}
              busy={props.restoring && t("restoring")}
            >
              <RotateCcw aria-hidden />
              {t("restore")}
            </Button>
            <Button variant="danger" onClick={props.onDelete}>
              {t("deletePermanently")}
            </Button>
          </span>
        </>
      )}
      {props.kind === "view" && (
        <>
          <Avatar
            id={props.sharedBy.id}
            name={props.sharedBy.name}
            src={props.sharedBy.profileImage}
            size="md"
          />
          <span className="ro-msg">
            {t.rich("view", {
              b: (chunks) => <b>{chunks}</b>,
              name: props.sharedBy.name.split(" ")[0],
            })}
          </span>
        </>
      )}
      {props.kind === "archived" && (
        <>
          {icon(<Archive />)}
          <span className="ro-msg">
            {t.rich("archived", { b: (chunks) => <b>{chunks}</b> })}
          </span>
          <span className="ro-acts">
            <Button variant="quiet" onClick={props.onUnarchive}>
              <ArchiveRestore aria-hidden />
              {t("unarchive")}
            </Button>
          </span>
        </>
      )}
      {props.kind === "offline" && (
        <>
          {icon(<CloudOff />)}
          <span className="ro-msg">
            {t.rich("offline", { b: (chunks) => <b>{chunks}</b> })}
          </span>
        </>
      )}
      {props.kind === "frozen" && (
        <>
          {icon(<Snowflake />)}
          <span className="ro-msg">
            {t.rich("frozen", {
              b: (chunks) => <b>{chunks}</b>,
              canUnfreeze: props.onUnfreeze ? "yes" : "no",
            })}
          </span>
          {props.onUnfreeze && (
            <span className="ro-acts">
              <Button variant="quiet" onClick={props.onUnfreeze}>
                <Snowflake aria-hidden />
                {t("unfreeze")}
              </Button>
            </span>
          )}
        </>
      )}
      {props.kind === "refused" && (
        <>
          {icon(<Lock />)}
          <span className="ro-msg">
            {t.rich("refused", { b: (chunks) => <b>{chunks}</b> })}
          </span>
        </>
      )}
    </div>
  );
}
