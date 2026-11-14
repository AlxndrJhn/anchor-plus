"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowDownAZ,
  ArrowLeft,
  Bell,
  BellRing,
  Camera,
  Check,
  CircleAlert,
  CloudOff,
  Copy,
  Ellipsis,
  History,
  ImagePlus,
  Images,
  List,
  ListChecks,
  ListRestart,
  ListX,
  LoaderCircle,
  Lock,
  LockOpen,
  LogOut,
  Palette,
  Pin,
  PinOff,
  Printer,
  Send,
  Settings2,
  Snowflake,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { IconButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tip } from "@/components/ui/tooltip";
import { usePreferencesStore } from "@/features/preferences";
import { useSyncStatus } from "@/features/sync";
import { useIsPhone } from "@/lib/hooks/use-is-phone";
import { useRovingFocus } from "@/lib/hooks/use-roving-focus";
import { cn } from "@/lib/utils";
import type { ChecklistActions } from "../../hooks/use-checklist-actions";
import {
  type BarWidth,
  MORE_GROUPS,
  type QuickAction,
  tidySetup,
} from "../../quick-actions";
import { isReminderPast, reminderLabel } from "../../reminder";
import type {
  NoteLockKind,
  NoteReminder,
  ReminderRecurrence,
} from "../../types";
import { BackgroundPicker } from "../background-picker";
import { ReminderPopoverContent } from "../reminder-picker";

export type SaveState = "new" | "saving" | "saved" | "offline" | "failed";

interface NoteEditorHeaderProps {
  saveState: SaveState;
  onRetrySave: () => void;
  onBack: () => void;
  trashed?: boolean;
  readOnly?: boolean;
  canSetReminder: boolean;
  saved: boolean;
  isOwner: boolean;
  canViewHistory: boolean;
  isPinned: boolean;
  isArchived: boolean;
  background: string | null;
  reminder: NoteReminder | null;
  sharedWithCount: number;
  onTogglePin: () => void;
  onBackground: (background: string | null) => void;
  onPreviewBackground: (background: string | null | false) => void;
  onReminder: (
    reminder: { remindAt: string; recurrence: ReminderRecurrence } | null,
  ) => void;
  onShare: () => void;
  onHistory: () => void;
  /** How the note is locked for this person, if it is. */
  lock: NoteLockKind | null;
  /** Opens the lock choices (Lock… or Change lock…). */
  onLock: () => void;
  onRemoveLock: () => void;
  /** Frozen: it can't be changed, trashed or deleted. */
  frozen: boolean;
  /** Freezes or unfreezes it; absent for those who don't own it. */
  onToggleFreeze?: () => void;
  /** Hands the note to another app (or copies it as text). */
  onSend: () => void;
  /** Opens the print dialog with the note. */
  onPrint: () => void;
  /** Makes a copy of the note; absent for a note not yet saved. */
  onCopy?: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onTrash: () => void;
  /** Google Keep's "Show checkboxes" or "Hide checkboxes", whichever fits. */
  checkboxes: "show" | "hide" | null;
  onCheckboxes: () => void;
  /** Only for a note you can edit. */
  checklist?: ChecklistActions;
  /** Pictures as attachments; absent while the note can't take them. */
  onAddImage?: () => void;
  onTakePicture?: () => void;
  onTakeSeveral?: () => void;
}

/** One of the note's actions, as the bar or More shows it. */
interface ActionSpec {
  label: string;
  icon: React.ReactNode;
  run: () => void;
  /** Runs once the menu has closed and let go of focus. */
  afterMenu?: boolean;
  /** Opens its popover rather than running. */
  popover?: "background" | "reminder";
  danger?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  /** Only for a note that's been saved. */
  needsSave?: boolean;
  className?: string;
}

type MenuEntry = QuickAction | "removeLock" | "editQuickActions";

export function NoteEditorHeader(props: NoteEditorHeaderProps) {
  const router = useRouter();
  const width: BarWidth = useIsPhone() ? "narrow" : "wide";
  const savedSetup = usePreferencesStore((s) => s.editor.quickActions?.[width]);
  const setup = React.useMemo(
    () => tidySetup(savedSetup, width),
    [savedSetup, width],
  );
  const [reminderOpen, setReminderOpen] = React.useState(false);
  const [backgroundOpen, setBackgroundOpen] = React.useState(false);
  // Read as More opens: the text isn't watched for them.
  const [counts, setCounts] = React.useState<{
    items: number;
    checked: number;
  } | null>(null);
  const roving = useRovingFocus<HTMLDivElement>();
  const [startedUnsaved] = React.useState(!props.saved);
  const afterSave = startedUnsaved && "after-save";
  // Runs once the menu has closed and let go of focus.
  const afterMenu = React.useRef<(() => void) | null>(null);
  const late = !!props.reminder && isReminderPast(props.reminder);
  const checkboxesLabel =
    props.checkboxes === "show" ? "Show checkboxes" : "Hide checkboxes";
  const trashLabel = props.isOwner ? "Move to trash" : "Remove from my notes";
  const bellLabel = props.reminder
    ? `${late ? "Late reminder" : "Reminder"}: ${reminderLabel(props.reminder)}`
    : "Add a reminder";
  const hasChecklist = !!props.checklist;
  const inMenuChecklist = (needsItems: boolean) =>
    hasChecklist && (!needsItems || !!counts?.items);

  const spec = (
    action: MenuEntry,
    where: "bar" | "menu",
  ): ActionSpec | null => {
    const inMenu = where === "menu";
    switch (action) {
      case "pin":
        return props.saved
          ? {
              label: props.isPinned ? "Unpin" : "Pin",
              icon: props.isPinned && inMenu ? <PinOff /> : <Pin />,
              run: props.onTogglePin,
              pressed: props.isPinned,
              needsSave: true,
            }
          : null;
      case "reminder":
        return props.canSetReminder
          ? {
              label: bellLabel,
              icon: late ? <BellRing /> : <Bell />,
              run: () => setReminderOpen(true),
              popover: "reminder",
              className: cn(
                props.reminder && (late ? "text-late" : "text-accent-strong"),
              ),
            }
          : null;
      case "background":
        return props.readOnly
          ? null
          : {
              label: "Background",
              icon: <Palette />,
              run: () => setBackgroundOpen(true),
              popover: "background",
            };
      case "addImage":
        return props.onAddImage
          ? { label: "Add image", icon: <ImagePlus />, run: props.onAddImage }
          : null;
      case "takePicture":
        return props.onTakePicture
          ? {
              label: "Take picture",
              icon: <Camera />,
              run: props.onTakePicture,
              afterMenu: true,
            }
          : null;
      case "takeSeveral":
        return props.onTakeSeveral
          ? {
              label: "Take several",
              icon: <Images />,
              run: props.onTakeSeveral,
              afterMenu: true,
            }
          : null;
      case "checkboxes":
        return !props.readOnly && props.checkboxes
          ? {
              label: checkboxesLabel,
              icon: props.checkboxes === "show" ? <ListChecks /> : <List />,
              run: props.onCheckboxes,
            }
          : null;
      case "uncheckAll":
        return props.checklist && (!inMenu || inMenuChecklist(true))
          ? {
              label: "Uncheck all",
              icon: <ListRestart />,
              run: props.checklist.uncheckAll,
              disabled: inMenu && counts?.checked === 0,
            }
          : null;
      case "deleteChecked":
        return props.checklist && (!inMenu || inMenuChecklist(true))
          ? {
              label: "Delete checked items",
              icon: <ListX />,
              run: props.checklist.deleteChecked,
              danger: true,
              disabled: inMenu && counts?.checked === 0,
            }
          : null;
      case "sortByName":
        return props.checklist && (!inMenu || inMenuChecklist(true))
          ? {
              label: "Sort A to Z",
              icon: <ArrowDownAZ />,
              run: props.checklist.sortByName,
              disabled: inMenu && (counts?.items ?? 0) < 2,
            }
          : null;
      case "share":
        return props.isOwner && props.saved
          ? {
              label: props.sharedWithCount ? "Sharing" : "Share",
              icon: <UserPlus />,
              run: props.onShare,
              needsSave: true,
            }
          : null;
      case "send":
        return props.saved
          ? {
              label: "Send",
              icon: <Send />,
              run: props.onSend,
              afterMenu: true,
              needsSave: true,
            }
          : null;
      case "print":
        return {
          label: "Print",
          icon: <Printer />,
          run: props.onPrint,
          afterMenu: true,
        };
      case "copy":
        return props.onCopy && props.saved
          ? {
              label: "Make a copy",
              icon: <Copy />,
              run: props.onCopy,
              needsSave: true,
            }
          : null;
      case "history":
        return props.canViewHistory && props.saved
          ? {
              label: "Version history",
              icon: <History />,
              run: props.onHistory,
              afterMenu: true,
              needsSave: true,
            }
          : null;
      case "lock":
        return props.saved
          ? {
              label: props.lock ? "Change lock…" : "Lock…",
              icon: <Lock />,
              run: props.onLock,
              afterMenu: true,
              needsSave: true,
            }
          : null;
      case "removeLock":
        return props.saved && props.lock
          ? {
              label: "Remove lock",
              icon: <LockOpen />,
              run: props.onRemoveLock,
              needsSave: true,
            }
          : null;
      case "freeze":
        return props.onToggleFreeze
          ? {
              label: props.frozen ? "Unfreeze" : "Freeze",
              icon: <Snowflake />,
              run: props.onToggleFreeze,
            }
          : null;
      case "archive":
        return props.saved
          ? {
              label: props.isArchived ? "Unarchive" : "Archive",
              icon: props.isArchived ? <ArchiveRestore /> : <Archive />,
              run: props.isArchived ? props.onUnarchive : props.onArchive,
              needsSave: true,
            }
          : null;
      case "trash":
        return props.saved && !(props.frozen && props.isOwner)
          ? {
              label: trashLabel,
              icon: props.isOwner ? <Trash2 /> : <LogOut />,
              run: props.onTrash,
              danger: true,
              needsSave: true,
            }
          : null;
      case "editQuickActions":
        return {
          label: "Edit quick actions",
          icon: <Settings2 />,
          run: () => router.push("/settings#set-quick-actions"),
          afterMenu: true,
        };
    }
  };

  const isInMore = (action: QuickAction) =>
    !setup.bar.includes(action) && !setup.hidden.includes(action);
  // More's groups as set, Remove lock where Lock is (even with Lock in the
  // bar), and Edit quick actions last.
  const menuGroups: { action: MenuEntry; spec: ActionSpec }[][] = [
    ...MORE_GROUPS.map((group) =>
      group.flatMap((action): MenuEntry[] =>
        action === "lock"
          ? [
              ...(isInMore("lock") ? (["lock"] as const) : []),
              ...(setup.hidden.includes("lock")
                ? []
                : (["removeLock"] as const)),
            ]
          : isInMore(action)
            ? [action]
            : [],
      ),
    ),
    ["editQuickActions" as const],
  ]
    .map((group) =>
      group.flatMap((action) => {
        const found = spec(action, "menu");
        return found ? [{ action, spec: found }] : [];
      }),
    )
    .filter((group) => group.length > 0);

  const bar = setup.bar.flatMap((action) => {
    const found = spec(action, "bar");
    return found ? [{ action, spec: found }] : [];
  });
  const isInBar = (popover: "background" | "reminder") =>
    bar.some(({ spec }) => spec.popover === popover);

  const barButton = (action: QuickAction, s: ActionSpec) => {
    const button = (
      <IconButton
        label={s.label}
        aria-pressed={s.pressed}
        onClick={s.popover ? undefined : s.run}
        className={cn(
          s.pressed !== undefined && "aria-pressed:[&_svg]:fill-current",
          s.needsSave && afterSave,
          s.className,
        )}
      >
        {s.icon}
      </IconButton>
    );
    if (!s.popover)
      return (
        <Tip key={action} label={s.label}>
          {button}
        </Tip>
      );
    return (
      <React.Fragment key={action}>
        {s.popover === "background"
          ? backgroundPopover(
              <Tip label={s.label}>
                <PopoverTrigger asChild>{button}</PopoverTrigger>
              </Tip>,
            )
          : reminderPopover(
              <Tip label={s.label}>
                <PopoverTrigger asChild>{button}</PopoverTrigger>
              </Tip>,
            )}
      </React.Fragment>
    );
  };

  // Opened from the bar, or from More: then it hangs below More.
  const backgroundPopover = (trigger: React.ReactNode) => (
    <Popover
      open={backgroundOpen}
      onOpenChange={(open) => {
        setBackgroundOpen(open);
        if (!open) props.onPreviewBackground(false);
      }}
    >
      {trigger}
      <PopoverContent align="end" className="p-0">
        <BackgroundPicker
          value={props.background}
          onChange={props.onBackground}
          onPreview={props.onPreviewBackground}
        />
      </PopoverContent>
    </Popover>
  );
  const reminderPopover = (trigger: React.ReactNode) => (
    <Popover open={reminderOpen} onOpenChange={setReminderOpen}>
      {trigger}
      <ReminderPopoverContent
        align="end"
        reminder={props.reminder}
        onReminder={props.onReminder}
        onClose={() => setReminderOpen(false)}
      />
    </Popover>
  );
  const besideMore = (
    <PopoverAnchor asChild>
      <span aria-hidden className="block h-10 w-0 self-center" />
    </PopoverAnchor>
  );

  return (
    <div
      ref={roving.ref}
      className="ed-head"
      role="toolbar"
      aria-label="Note"
      onFocus={roving.onFocus}
      onKeyDown={roving.onKeyDown}
    >
      <div className="ed-head-l">
        <Tip label="Back">
          <IconButton label="Back" onClick={props.onBack}>
            <ArrowLeft />
          </IconButton>
        </Tip>
        <SaveStatus state={props.saveState} onRetry={props.onRetrySave} />
      </div>
      {props.trashed && props.canViewHistory && (
        <div className="ed-head-r">
          <Tip label="Version history">
            <IconButton label="Version history" onClick={props.onHistory}>
              <History />
            </IconButton>
          </Tip>
        </div>
      )}
      {!props.trashed && (
        <div className="ed-head-r">
          {bar.map(({ action, spec: s }) => barButton(action, s))}
          <DropdownMenu
            onOpenChange={(open) => {
              if (open) setCounts(props.checklist?.getCounts() ?? null);
            }}
          >
            <Tip label="More">
              <DropdownMenuTrigger asChild>
                <IconButton label="More">
                  <Ellipsis />
                </IconButton>
              </DropdownMenuTrigger>
            </Tip>
            <DropdownMenuContent
              align="end"
              className="min-w-55"
              onCloseAutoFocus={(e) => {
                const next = afterMenu.current;
                if (!next) return;
                afterMenu.current = null;
                e.preventDefault();
                next();
              }}
            >
              {menuGroups.map((group, i) => (
                <React.Fragment key={group[0].action}>
                  {i > 0 && <DropdownMenuSeparator />}
                  {group.map(({ action, spec: s }) => (
                    <DropdownMenuItem
                      key={action}
                      tone={s.danger ? "danger" : undefined}
                      disabled={s.disabled}
                      className={s.className}
                      onSelect={() => {
                        if (s.afterMenu || s.popover) afterMenu.current = s.run;
                        else s.run();
                      }}
                    >
                      {s.icon}
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {!isInBar("background") &&
            !props.readOnly &&
            backgroundPopover(besideMore)}
          {!isInBar("reminder") &&
            props.canSetReminder &&
            reminderPopover(besideMore)}
        </div>
      )}
    </div>
  );
}

function SaveStatus({
  state,
  onRetry,
}: {
  state: SaveState;
  onRetry: () => void;
}) {
  const online = useSyncStatus((s) => s.online);
  if (state === "new") return null;
  const labelClass = "max-md:sr-only";
  const waitingHint = online
    ? "The server isn’t answering. Keep this tab open so your changes can be saved."
    : "You’re offline. Your changes are kept on this device and saved when you’re back online.";
  return (
    <span className="save" aria-live="polite">
      {state === "saved" && (
        <span data-s>
          <Check aria-hidden />
          <span className={labelClass}>Saved</span>
        </span>
      )}
      {state === "saving" && (
        <span data-s>
          <LoaderCircle aria-hidden className="animate-spin" />
          <span className={labelClass}>Saving…</span>
        </span>
      )}
      {state === "offline" && (
        <Tip label={waitingHint}>
          <span data-s>
            <CloudOff aria-hidden />
            <span className={labelClass}>Waiting to save</span>
            <span className="sr-only">. {waitingHint}</span>
          </span>
        </Tip>
      )}
      {state === "failed" && (
        <span data-s className="font-medium text-late">
          <CircleAlert aria-hidden />
          <span className={labelClass}>Couldn’t save</span>
          <button
            type="button"
            onClick={onRetry}
            className="ml-0.5 cursor-pointer border-0 bg-transparent p-0 font-semibold text-inherit underline decoration-current/35 underline-offset-3 hover:decoration-current"
          >
            Try again
          </button>
        </span>
      )}
    </span>
  );
}
