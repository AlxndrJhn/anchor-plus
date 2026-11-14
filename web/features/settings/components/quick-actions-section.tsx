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
import { useTranslations } from "next-intl";
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
const ICONS: Record<QuickAction, React.ReactNode> = {
  pin: <Pin />,
  reminder: <Bell />,
  addImage: <ImagePlus />,
  takePicture: <Camera />,
  takeSeveral: <Images />,
  checkboxes: <ListChecks />,
  uncheckAll: <ListRestart />,
  deleteChecked: <ListX />,
  sortByName: <ArrowDownAZ />,
  share: <UserPlus />,
  send: <Send />,
  print: <Printer />,
  copy: <Copy />,
  history: <History />,
  background: <Palette />,
  lock: <Lock />,
  freeze: <Snowflake />,
  archive: <Archive />,
  trash: <Trash2 />,
};

/**
 * A note's bar beside More, in order, and what More offers: each action in
 * the bar, in More, or turned off. Set apart for narrow and wide windows.
 */
export function QuickActionsSection() {
  const t = useTranslations("settings.quickActions");
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

  const name = (action: QuickAction) => t(`actions.${action}`);
  const label = (action: QuickAction) => (
    <span className="flex min-w-0 flex-1 items-center gap-3 font-medium text-ui [&_svg]:size-4.25 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
      {ICONS[action]}
      {name(action)}
    </span>
  );

  return (
    <Section
      id="quick-actions"
      title={t("title")}
      description={t("description")}
    >
      <Row>
        <RowText title={t("window")} text={t("windowText", { width })} />
        <SegmentedControl<BarWidth>
          aria-label={t("window")}
          size="sm"
          value={width}
          onValueChange={setWidth}
          options={[
            { value: "narrow", label: t("narrow") },
            { value: "wide", label: t("wide") },
          ]}
        />
      </Row>
      <Row className="py-3">
        <RowText
          title={t("inBar")}
          text={t("inBarText", { max: MAX_BAR[width] })}
        />
      </Row>
      {setup.bar.length === 0 && (
        <Row className="py-3 text-meta text-muted-foreground">
          {t("barEmpty")}
        </Row>
      )}
      {setup.bar.map((action, index) => (
        <Row key={action} className="gap-2 py-2 max-md:py-2">
          {label(action)}
          <IconButton
            size="sm"
            label={t("moveUp", { action: name(action) })}
            disabled={index === 0}
            onClick={() => move(index, index - 1)}
          >
            <ChevronUp />
          </IconButton>
          <IconButton
            size="sm"
            label={t("moveDown", { action: name(action) })}
            disabled={index === setup.bar.length - 1}
            onClick={() => move(index, index + 1)}
          >
            <ChevronDown />
          </IconButton>
          <IconButton
            size="sm"
            label={t("takeOut", { action: name(action) })}
            onClick={() => setBar(setup.bar.filter((a) => a !== action))}
          >
            <CircleMinus />
          </IconButton>
        </Row>
      ))}
      <Row className="py-3">
        <RowText title={t("inMore")} text={t("inMoreText")} />
      </Row>
      {QUICK_ACTIONS.filter((a) => !setup.bar.includes(a)).map((action) => {
        const isOn = !setup.hidden.includes(action);
        return (
          <Row key={action} className="gap-2 py-2 max-md:py-2">
            {label(action)}
            <IconButton
              size="sm"
              label={t("putIn", { action: name(action) })}
              disabled={!isOn || isFull}
              onClick={() => setBar([...setup.bar, action])}
            >
              <CirclePlus />
            </IconButton>
            <Switch
              aria-label={name(action)}
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
              () => toast.success(t("copied")),
              () => toast.error(t("copyFailed")),
            )
          }
        >
          <Copy />
          {t("copy")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={async () => {
            const text = await navigator.clipboard.readText().catch(() => null);
            const pasted = decodeSetup(text, width);
            if (!pasted) {
              toast.error(t("pasteFailed"));
              return;
            }
            save(pasted);
            toast.success(t("pasted"));
          }}
        >
          <ClipboardPaste />
          {t("paste")}
        </Button>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          disabled={!saved?.[width]}
          onClick={() => save(undefined)}
        >
          <RotateCcw />
          {t("reset")}
        </Button>
      </Row>
    </Section>
  );
}
