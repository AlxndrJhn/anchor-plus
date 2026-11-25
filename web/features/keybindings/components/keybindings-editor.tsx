"use client";

import {
  Braces,
  CircleAlert,
  Keyboard,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, InputButton } from "@/components/ui/input";
import { Tip } from "@/components/ui/tooltip";
import { usePreferencesStore } from "@/features/preferences";
import { isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { CATEGORIES, COMMANDS, type CommandId } from "../commands";
import {
  addRule,
  isChanged,
  removeRule,
  replaceRule,
  resetCommand,
} from "../edit";
import {
  chordMatches,
  chordText,
  isSingleCharacter,
  keysInQuery,
  parseStroke,
  strokeForJson,
  strokeFromEvent,
} from "../keys";
import { type ActiveRule, activeRules, conflictsOf } from "../rules";
import { useKeybindingsStore } from "../store";
import { parseWhen } from "../when";
import { JsonView } from "./json-view";
import { Keys } from "./keys-view";
import { RecordDialog, type RecordTarget } from "./record-dialog";

interface Row {
  command: CommandId;
  rule?: ActiveRule;
}

/** The Keyboard shortcuts page, after VS Code's. */
export function KeybindingsEditor() {
  const t = useTranslations("keybindings");
  const user = useKeybindingsStore((s) => s.rules);
  const setRules = useKeybindingsStore((s) => s.setRules);
  const singleKeysOff = usePreferencesStore(
    (s) => s.editor.singleKeyShortcuts === false,
  );
  const mac = isMac();
  const rules = React.useMemo(() => activeRules(user, mac), [user, mac]);
  const [query, setQuery] = React.useState("");
  const [onlyChanged, setOnlyChanged] = React.useState(false);
  const [json, setJson] = React.useState(false);
  const [recording, setRecording] = React.useState<RecordTarget | null>(null);
  const [editingWhen, setEditingWhen] = React.useState<ActiveRule | null>(null);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [recordingKeys, setRecordingKeys] = React.useState(false);
  const searchField = React.useRef<HTMLInputElement>(null);

  const title = (command: string) => t(`commands.${command as CommandId}`);

  const toggleRecordingKeys = () => {
    if (!recordingKeys) setQuery("");
    setRecordingKeys(!recordingKeys);
    searchField.current?.focus();
  };

  /** While recording, a press goes into the search as keys, as in VS Code. */
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const plain = !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey;
    const altK =
      e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === "KeyK";
    if (altK) {
      e.preventDefault();
      toggleRecordingKeys();
      return;
    }
    if (!recordingKeys) return;
    if (plain && e.key === "Tab") return;
    if (plain && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setRecordingKeys(false);
      return;
    }
    const stroke = strokeFromEvent(e.nativeEvent);
    if (!stroke) return;
    e.preventDefault();
    e.stopPropagation();
    const text = strokeForJson(stroke, mac);
    setQuery((was) => {
      const held = /^"([^"]+)"$/.exec(was.trim())?.[1].split(" ") ?? [];
      // A chord has two strokes; a third starts again.
      return `"${held.length === 1 ? `${held[0]} ${text}` : text}"`;
    });
  };

  // A few dozen rows: worked out at each draw.
  const rows = (() => {
    const needle = query.trim().toLowerCase();
    const wantedKeys = keysInQuery(query, mac);
    const out: Row[] = [];
    for (const command of COMMANDS) {
      if (onlyChanged && !isChanged(user, command.id)) continue;
      const own = rules.filter((r) => r.command === command.id);
      const list: Row[] =
        own.length || wantedKeys
          ? own.map((rule) => ({ command: command.id, rule }))
          : [{ command: command.id }];
      for (const row of list) {
        if (wantedKeys) {
          if (!row.rule || !chordMatches(row.rule.key, wantedKeys)) continue;
        } else if (needle) {
          const haystack = [
            title(row.command),
            row.command,
            row.rule ? chordText(row.rule.key, mac) : "",
            row.rule?.key ?? "",
            row.rule?.when ?? "",
          ]
            .join(" ")
            .toLowerCase();
          if (!needle.split(/\s+/).every((word) => haystack.includes(word)))
            continue;
        }
        out.push(row);
      }
    }
    return out;
  })();

  const save = (next: typeof user) => setRules(next);
  const commandCount = new Set(rows.map((r) => r.command)).size;

  return (
    <div className="grid min-w-0 gap-4">
      <p className="m-0 max-w-170 text-control text-muted-foreground">
        {t("intro")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!json && (
          <Input
            ref={searchField}
            type="search"
            boxClassName="w-90 max-w-full"
            icon={<Search aria-hidden />}
            placeholder={recordingKeys ? t("recordKeys.waiting") : t("search")}
            aria-label={t("search")}
            data-records-keys={recordingKeys || undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            onBlur={() => setRecordingKeys(false)}
            end={
              <Tip
                label={`${t("recordKeys.toggle")} (${chordText("alt+k", mac)})`}
              >
                <InputButton
                  aria-label={t("recordKeys.toggle")}
                  aria-pressed={recordingKeys}
                  // Keeps the field focused, so recording goes on.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleRecordingKeys}
                  className={cn(
                    "grid place-items-center px-1.5 [&>svg]:size-4",
                    recordingKeys &&
                      "bg-accent-ink/14 text-accent-ink hover:bg-accent-ink/20",
                  )}
                >
                  <Keyboard aria-hidden />
                </InputButton>
              </Tip>
            }
          />
        )}
        {!json && (
          <Button
            variant={onlyChanged ? "primary" : "secondary"}
            size="sm"
            aria-pressed={onlyChanged}
            onClick={() => setOnlyChanged((was) => !was)}
          >
            {t("onlyChanged")}
          </Button>
        )}
        <span className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setJson((was) => !was)}
        >
          {json ? <List aria-hidden /> : <Braces aria-hidden />}
          {json ? t("showTable") : t("showJson")}
        </Button>
        <Button
          variant="quiet"
          size="sm"
          disabled={!user.length}
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw aria-hidden />
          {t("resetAll")}
        </Button>
      </div>

      {json ? (
        <JsonView />
      ) : (
        <>
          <span
            className="px-1 text-meta text-muted-foreground"
            aria-live="polite"
          >
            {rows.length ? t("count", { count: commandCount }) : t("noMatch")}
          </span>
          <div className="overflow-x-auto rounded-2xl bg-card shadow-[0_0_0_1px_color-mix(in_srgb,var(--border)_60%,transparent),var(--sh-xs)]">
            <table className="w-full min-w-200 border-collapse text-control">
              <thead>
                <tr>
                  {(["command", "key", "when", "source"] as const).map((c) => (
                    <th
                      key={c}
                      className="whitespace-nowrap border-border/55 border-b px-3.5 py-2 text-left font-semibold text-label text-muted-foreground uppercase tracking-[.04em]"
                    >
                      {t(`columns.${c}`)}
                    </th>
                  ))}
                  <th className="border-border/55 border-b" />
                </tr>
              </thead>
              {CATEGORIES.map((category) => {
                const inCategory = rows.filter(
                  (r) =>
                    COMMANDS.find((c) => c.id === r.command)?.category ===
                    category,
                );
                if (!inCategory.length) return null;
                return (
                  <tbody key={category}>
                    <tr>
                      <th
                        colSpan={5}
                        scope="colgroup"
                        className="bg-foreground/2.5 px-3.5 py-1.5 text-left font-semibold text-label text-muted-foreground uppercase"
                      >
                        {t(`categories.${category}`)}
                      </th>
                    </tr>
                    {inCategory.map((row, i) => {
                      const rule = row.rule;
                      const conflicts = rule ? conflictsOf(rule, rules) : [];
                      const dead =
                        !!rule &&
                        singleKeysOff &&
                        rule.key
                          .split(" ")
                          .some((s) => isSingleCharacter(parseStroke(s, mac)));
                      const first =
                        i === 0 || inCategory[i - 1].command !== row.command;
                      return (
                        <tr
                          key={`${row.command}-${rule?.source}-${rule?.index ?? rule?.key ?? ""}-${rule?.when ?? ""}`}
                          className="group/row hover:[&>td]:bg-foreground/2.5"
                        >
                          <td className="border-border/45 border-t px-3.5 py-2 align-middle">
                            {first ? (
                              <span className="grid">
                                <span className="text-ui">
                                  {title(row.command)}
                                </span>
                                <code className="text-meta text-muted-foreground">
                                  {row.command}
                                </code>
                              </span>
                            ) : (
                              <span className="sr-only">
                                {title(row.command)}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap border-border/45 border-t px-3.5 py-2 align-middle">
                            <span className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                className="cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-1 text-left hover:bg-foreground/6"
                                aria-label={
                                  rule
                                    ? t("row.changeKey", {
                                        command: title(row.command),
                                        key: chordText(rule.key, mac),
                                      })
                                    : t("row.addKey", {
                                        command: title(row.command),
                                      })
                                }
                                onClick={() =>
                                  setRecording(
                                    rule
                                      ? { kind: "change", rule }
                                      : { kind: "add", command: row.command },
                                  )
                                }
                              >
                                {rule ? (
                                  <span className={cn(dead && "opacity-45")}>
                                    <Keys chord={rule.key} mac={mac} />
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    {t("unbound")}
                                  </span>
                                )}
                              </button>
                              {conflicts.length > 0 && (
                                <Tip
                                  label={`${t("row.conflicts", {
                                    count: conflicts.length,
                                  })}: ${conflicts
                                    .map((c) => title(c.command))
                                    .join(", ")}`}
                                >
                                  <CircleAlert
                                    tabIndex={0}
                                    aria-label={t("row.conflicts", {
                                      count: conflicts.length,
                                    })}
                                    className="size-3.75 text-muted-foreground"
                                  />
                                </Tip>
                              )}
                              {dead && (
                                <Tip label={t("row.singleKeysOff")}>
                                  <CircleAlert
                                    tabIndex={0}
                                    aria-label={t("row.singleKeysOff")}
                                    className="size-3.75 text-late"
                                  />
                                </Tip>
                              )}
                            </span>
                          </td>
                          <td className="border-border/45 border-t px-3.5 py-2 align-middle">
                            {rule && editingWhen === rule ? (
                              <WhenField
                                initial={rule.when ?? ""}
                                onCancel={() => setEditingWhen(null)}
                                onSave={(when) => {
                                  save(replaceRule(user, rule, rule.key, when));
                                  setEditingWhen(null);
                                }}
                              />
                            ) : rule ? (
                              <button
                                type="button"
                                className="max-w-80 cursor-pointer truncate rounded-md border-0 bg-transparent px-1.5 py-1 text-left font-mono text-meta hover:bg-foreground/6"
                                title={t("row.editWhen")}
                                onClick={() => setEditingWhen(rule)}
                              >
                                {rule.when ?? (
                                  <span className="font-sans text-muted-foreground">
                                    {t("row.whenPlaceholder")}
                                  </span>
                                )}
                              </button>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap border-border/45 border-t px-3.5 py-2 align-middle text-meta">
                            {rule && (
                              <span
                                className={cn(
                                  "rounded-pill px-2 py-0.5",
                                  rule.source === "user"
                                    ? "bg-accent-ink/12 font-semibold text-accent-ink"
                                    : "text-muted-foreground",
                                )}
                              >
                                {t(`source.${rule.source}`)}
                              </span>
                            )}
                          </td>
                          <td className="w-px border-border/45 border-t px-2 py-2 align-middle">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="quiet"
                                  size="sm"
                                  aria-label={t("row.actions", {
                                    command: title(row.command),
                                  })}
                                  className="opacity-60 group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                                >
                                  <MoreHorizontal aria-hidden />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {rule && (
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      setRecording({ kind: "change", rule })
                                    }
                                  >
                                    <Pencil aria-hidden />
                                    {t("row.change")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setRecording({
                                      kind: "add",
                                      command: row.command,
                                    })
                                  }
                                >
                                  <Plus aria-hidden />
                                  {t("row.add")}
                                </DropdownMenuItem>
                                {rule && (
                                  <DropdownMenuItem
                                    onSelect={() => setEditingWhen(rule)}
                                  >
                                    <Braces aria-hidden />
                                    {t("row.editWhen")}
                                  </DropdownMenuItem>
                                )}
                                {rule && (
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      save(removeRule(user, rule))
                                    }
                                  >
                                    <Trash2 aria-hidden />
                                    {t("row.remove")}
                                  </DropdownMenuItem>
                                )}
                                {isChanged(user, row.command) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onSelect={() =>
                                        save(resetCommand(user, row.command))
                                      }
                                    >
                                      <RotateCcw aria-hidden />
                                      {t("row.reset")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>
          </div>
        </>
      )}

      <RecordDialog
        target={recording}
        rules={rules}
        onClose={() => setRecording(null)}
        onSave={(key, when) => {
          if (!recording) return;
          save(
            recording.kind === "change"
              ? replaceRule(user, recording.rule, key, when)
              : addRule(user, recording.command, key, when),
          );
          setRecording(null);
        }}
      />
      <ConfirmationDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t("resetAllConfirm")}
        description={t("resetAllText")}
        confirmLabel={t("resetAll")}
        onConfirm={() => {
          save([]);
          setConfirmReset(false);
        }}
      />
    </div>
  );
}

function WhenField({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (when: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("keybindings");
  const [value, setValue] = React.useState(initial);
  const error = React.useMemo(() => {
    try {
      parseWhen(value);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [value]);
  return (
    <Input
      autoFocus
      mono
      size="sm"
      boxClassName="min-w-60"
      value={value}
      placeholder={t("row.whenPlaceholder")}
      aria-label={t("columns.when")}
      aria-invalid={!!error}
      title={error ?? t("row.whenHelp")}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        } else if (e.key === "Enter" && !error) {
          e.preventDefault();
          onSave(value);
        }
      }}
    />
  );
}
