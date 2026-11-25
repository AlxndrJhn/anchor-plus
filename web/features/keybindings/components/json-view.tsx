"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { isMac } from "@/lib/platform";
import { CONTEXT_KEYS } from "../commands";
import {
  DEFAULT_RULES,
  parseJsonc,
  type RuleProblem,
  rulesToJson,
  validateRules,
} from "../rules";
import { type KeybindingRule, useKeybindingsStore } from "../store";

/** keybindings.json: the user's rules as text, with the defaults beside. */
export function JsonView() {
  const t = useTranslations("keybindings");
  const user = useKeybindingsStore((s) => s.rules);
  const setRules = useKeybindingsStore((s) => s.setRules);
  const saved = React.useMemo(() => rulesToJson(user), [user]);
  const [text, setText] = React.useState(saved);
  const [justSaved, setJustSaved] = React.useState(false);
  // Changes made elsewhere (another tab) show unless the text was edited.
  const lastSaved = React.useRef(saved);
  React.useEffect(() => {
    setText((was) => (was === lastSaved.current ? saved : was));
    lastSaved.current = saved;
  }, [saved]);

  const check = React.useMemo((): {
    rules?: KeybindingRule[];
    syntax?: string;
    problems: RuleProblem[];
  } => {
    let value: unknown;
    try {
      value = parseJsonc(text);
    } catch (e) {
      return { syntax: (e as Error).message, problems: [] };
    }
    const problems = validateRules(value, isMac());
    return {
      rules: problems.length ? undefined : (value as KeybindingRule[]),
      problems,
    };
  }, [text]);
  const edited = text !== saved;

  return (
    <div className="grid min-w-0 gap-4">
      <section className="grid gap-2">
        <h2 className="m-0 font-mono text-ui">{t("json.title")}</h2>
        <p className="m-0 max-w-170 text-control text-muted-foreground">
          {t("json.intro")}
        </p>
        <textarea
          aria-label={t("json.title")}
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setJustSaved(false);
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
              e.preventDefault();
              if (check.rules) {
                setRules(check.rules);
                setJustSaved(true);
              }
            }
          }}
          aria-invalid={!!check.syntax || check.problems.length > 0}
          rows={Math.min(24, Math.max(8, text.split("\n").length + 2))}
          className="w-full resize-y rounded-lg bg-card p-3 font-mono text-meta leading-relaxed shadow-[inset_0_0_0_1px_var(--input)] focus-visible:shadow-[inset_0_0_0_2px_var(--ring)] focus-visible:outline-none aria-invalid:shadow-[inset_0_0_0_2px_var(--destructive)]"
        />
        {(check.syntax || check.problems.length > 0) && (
          <ul
            className="m-0 grid gap-0.5 pl-4 text-destructive text-meta"
            aria-live="polite"
          >
            {check.syntax && (
              <li>{t("json.invalidJson", { error: check.syntax })}</li>
            )}
            {check.problems.map((p) => (
              <li key={`${p.index}-${p.message}`}>
                {p.index < 0
                  ? p.message
                  : t("json.line", { index: p.index + 1, problem: p.message })}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <Button
            disabled={!edited || !check.rules}
            onClick={() => {
              if (!check.rules) return;
              setRules(check.rules);
              setJustSaved(true);
            }}
          >
            {t("json.save")}
          </Button>
          {edited && (
            <Button variant="quiet" onClick={() => setText(saved)}>
              {t("json.revert")}
            </Button>
          )}
          {justSaved && !edited && (
            <span className="inline-flex items-center gap-1 text-meta text-muted-foreground">
              <Check aria-hidden className="size-3.5" />
              {t("json.saved")}
            </span>
          )}
        </div>
      </section>

      <Reference title={t("json.defaults")} text={rulesToJson(DEFAULT_RULES)} />
      <details className="rounded-lg bg-card px-4 py-2.5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--border)_60%,transparent)]">
        <summary className="cursor-pointer font-semibold text-ui">
          {t("json.contextKeys")}
        </summary>
        <dl className="m-0 mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-meta">
          {CONTEXT_KEYS.map((key) => (
            <React.Fragment key={key}>
              <dt>
                <code>{key}</code>
              </dt>
              <dd className="m-0 text-muted-foreground">
                {t(`context.${key}`)}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </details>
    </div>
  );
}

function Reference({ title, text }: { title: string; text: string }) {
  const t = useTranslations("keybindings");
  const [copied, setCopied] = React.useState(false);
  return (
    <details className="rounded-lg bg-card px-4 py-2.5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--border)_60%,transparent)]">
      <summary className="cursor-pointer font-semibold text-ui">
        {title}
      </summary>
      <div className="relative mt-2">
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-1 right-1"
          onClick={() =>
            void copyText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {t("json.copy")}
        </Button>
        <pre className="m-0 max-h-100 overflow-auto rounded-md bg-foreground/4 p-3 font-mono text-meta leading-relaxed">
          {text}
        </pre>
      </div>
    </details>
  );
}
