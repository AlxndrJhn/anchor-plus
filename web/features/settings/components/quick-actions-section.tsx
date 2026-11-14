"use client";

import {
  Archive,
  ArrowDownAZ,
  Bell,
  Camera,
  ChevronDown,
  ChevronUp,
  CircleMinus,
  CirclePlus,
  ClipboardPaste,
  Copy,
  History,
  ImagePlus,
  Images,
  ListChecks,
  ListRestart,
  ListX,
  Lock,
  Palette,
  Pin,
  Printer,
  RotateCcw,
  Send,
  Snowflake,
  Trash2,
  UserPlus,
} from "lucide-react";
import * as React from "react";
import { Button, IconButton } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  type BarWidth,
  decodeSetup,
  encodeSetup,
  MAX_BAR,
  QUICK_ACTIONS,
  type QuickAction,
  type QuickActionSetup,
  tidySetup,
} from "@/features/notes/quick-actions";
import { usePreferencesStore } from "@/features/preferences";
import { copyText } from "@/lib/clipboard";
import { useIsPhone } from "@/lib/hooks/use-is-phone";
import { Row, RowText, Section } from "./settings-blocks";

/** As Settings lists them, the same names as on Android. */
const ACTIONS: Record<QuickAction, { label: string; icon: React.ReactNode }> = {
  pin: { label: "Pin", icon: <Pin /> },
  reminder: { label: "Reminder", icon: <Bell /> },
  addImage: { label: "Add image", icon: <ImagePlus /> },
  takePicture: { label: "Take picture", icon: <Camera /> },
  takeSeveral: { label: "Take several", icon: <Images /> },
  checkboxes: { label: "Checkboxes", icon: <ListChecks /> },
  uncheckAll: { label: "Uncheck all", icon: <ListRestart /> },
  deleteChecked: { label: "Delete checked items", icon: <ListX /> },
  sortByName: { label: "Sort A to Z", icon: <ArrowDownAZ /> },
  share: { label: "Share", icon: <UserPlus /> },
  send: { label: "Send", icon: <Send /> },
  print: { label: "Print", icon: <Printer /> },
  copy: { label: "Make a copy", icon: <Copy /> },
  history: { label: "Version history", icon: <History /> },
  background: { label: "Background", icon: <Palette /> },
  lock: { label: "Lock", icon: <Lock /> },
  freeze: { label: "Freeze", icon: <Snowflake /> },
  archive: { label: "Archive", icon: <Archive /> },
  trash: { label: "Move to trash", icon: <Trash2 /> },
};

const WIDTHS: Record<BarWidth, string> = {
  narrow: "a narrow window, such as a phone",
  wide: "a wide window",
};

/**
 * A note's bar beside More, in order, and what More offers: each action in
 * the bar, in More, or turned off. Set apart for narrow and wide windows.
 */
export function QuickActionsSection() {
  const isPhone = useIsPhone();
  const [width, setWidth] = React.useState<BarWidth>(
    isPhone ? "narrow" : "wide",
  );
  const saved = usePreferencesStore((s) => s.editor.quickActions);
  const setEditorPreference = usePreferencesStore((s) => s.setEditorPreference);
  const setup = tidySetup(saved?.[width], width);
  const isFull = setup.bar.length >= MAX_BAR[width];

  const save = (next: QuickActionSetup | undefined) =>
    setEditorPreference("quickActions", { ...saved, [width]: next });
  const setBar = (bar: QuickAction[]) =>
    save({ bar, hidden: setup.hidden.filter((a) => !bar.includes(a)) });
  const move = (from: number, to: number) => {
    const bar = [...setup.bar];
    bar.splice(to, 0, ...bar.splice(from, 1));
    setBar(bar);
  };

  const label = (action: QuickAction) => (
    <span className="flex min-w-0 flex-1 items-center gap-3 font-medium text-ui [&_svg]:size-4.25 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
      {ACTIONS[action].icon}
      {ACTIONS[action].label}
    </span>
  );

  return (
    <Section
      id="quick-actions"
      title="Quick actions"
      description="The buttons beside More when a note is open, and what More offers. On this device only."
    >
      <Row>
        <RowText
          title="Window"
          text={`What a note shows in ${WIDTHS[width]}.`}
        />
        <SegmentedControl<BarWidth>
          aria-label="Window"
          size="sm"
          value={width}
          onValueChange={setWidth}
          options={[
            { value: "narrow", label: "Narrow" },
            { value: "wide", label: "Wide" },
          ]}
        />
      </Row>
      <Row className="py-3">
        <RowText
          title="In the bar"
          text={`Up to ${MAX_BAR[width]}, beside More, in this order.`}
        />
      </Row>
      {setup.bar.length === 0 && (
        <Row className="py-3 text-meta text-muted-foreground">
          Nothing in the bar: everything is in More.
        </Row>
      )}
      {setup.bar.map((action, index) => (
        <Row key={action} className="gap-2 py-2 max-md:py-2">
          {label(action)}
          <IconButton
            size="sm"
            label={`Move ${ACTIONS[action].label} up`}
            disabled={index === 0}
            onClick={() => move(index, index - 1)}
          >
            <ChevronUp />
          </IconButton>
          <IconButton
            size="sm"
            label={`Move ${ACTIONS[action].label} down`}
            disabled={index === setup.bar.length - 1}
            onClick={() => move(index, index + 1)}
          >
            <ChevronDown />
          </IconButton>
          <IconButton
            size="sm"
            label={`Take ${ACTIONS[action].label} out of the bar`}
            onClick={() => setBar(setup.bar.filter((a) => a !== action))}
          >
            <CircleMinus />
          </IconButton>
        </Row>
      ))}
      <Row className="py-3">
        <RowText
          title="In More"
          text="Turned off, an action is in neither the bar nor More."
        />
      </Row>
      {QUICK_ACTIONS.filter((a) => !setup.bar.includes(a)).map((action) => {
        const isOn = !setup.hidden.includes(action);
        return (
          <Row key={action} className="gap-2 py-2 max-md:py-2">
            {label(action)}
            <IconButton
              size="sm"
              label={`Put ${ACTIONS[action].label} in the bar`}
              disabled={!isOn || isFull}
              onClick={() => setBar([...setup.bar, action])}
            >
              <CirclePlus />
            </IconButton>
            <Switch
              aria-label={ACTIONS[action].label}
              checked={isOn}
              onCheckedChange={(on) =>
                save({
                  bar: setup.bar,
                  hidden: on
                    ? setup.hidden.filter((a) => a !== action)
                    : [...setup.hidden, action],
                })
              }
            />
          </Row>
        );
      })}
      <Row className="gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            copyText(encodeSetup(setup)).then(
              () => toast.success("Quick actions copied"),
              () => toast.error("Couldn’t copy them"),
            )
          }
        >
          <Copy />
          Copy setup
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={async () => {
            const text = await navigator.clipboard.readText().catch(() => null);
            const pasted = decodeSetup(text, width);
            if (!pasted) {
              toast.error("The clipboard has no copied quick actions");
              return;
            }
            save(pasted);
            toast.success("Quick actions pasted");
          }}
        >
          <ClipboardPaste />
          Paste setup
        </Button>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          disabled={!saved?.[width]}
          onClick={() => save(undefined)}
        >
          <RotateCcw />
          Reset
        </Button>
      </Row>
    </Section>
  );
}
