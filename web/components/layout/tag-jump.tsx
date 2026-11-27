"use client";

import { Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { tagColorStyle } from "@/features/tags";
import { pushInPage } from "@/lib/in-page-nav";
import { cn } from "@/lib/utils";
import { type GoToTarget, matchTargets, useGoToTargets } from "./go-to";

/**
 * # and a few letters of a tag's name: the tag opens as soon as only one
 * is left, or Enter opens the first.
 */
export function TagJump({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("layout.tagJump");
  const router = useRouter();
  const tags = useGoToTargets({ pages: false });
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = React.useId();
  const matches = query.trim() ? matchTargets(tags, query) : tags;
  const shown = matches[Math.min(active, matches.length - 1)];

  const go = (tag: GoToTarget) => {
    onOpenChange(false);
    if (!pushInPage(tag.href)) router.push(tag.href);
  };
  const type = (value: string) => {
    setQuery(value);
    setActive(0);
    const found = matchTargets(tags, value);
    if (value.trim() && found.length === 1) go(found[0]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) return onOpenChange(true);
        onOpenChange(false);
        setQuery("");
        setActive(0);
      }}
    >
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        className="gap-2 px-2 pt-2 pb-2 [--dialog-top:8px]"
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <label className="flex h-10 items-center gap-2 rounded-md px-2.5 text-muted-foreground focus-within:shadow-[inset_0_0_0_2px_var(--ring)] [&>svg]:size-4">
          <Hash aria-hidden />
          <input
            role="combobox"
            aria-label={t("tagName")}
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={shown ? `${listId}-${shown.id}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const step = e.key === "ArrowDown" ? 1 : -1;
                setActive(
                  (i) => (i + step + matches.length) % (matches.length || 1),
                );
              } else if (e.key === "Enter" && shown) {
                e.preventDefault();
                go(shown);
              }
            }}
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-foreground text-ui outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div
          id={listId}
          role="listbox"
          aria-label={t("tags")}
          className="grid max-h-80 gap-px overflow-auto"
        >
          {matches.map((tag) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the field's arrows and Enter pick it (aria-activedescendant)
            <div
              key={tag.id}
              id={`${listId}-${tag.id}`}
              role="option"
              aria-selected={tag === shown}
              tabIndex={-1}
              style={tagColorStyle(tag.color)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(tag)}
              className={cn(
                "tag-color flex h-8 cursor-pointer items-center gap-3 rounded-md pl-[11.5px] text-control",
                tag === shown && "bg-muted",
              )}
            >
              <span
                aria-hidden
                className="inline-grid w-4.25 place-items-center text-(--hash) [&>svg]:size-3.75 [&>svg]:stroke-[2.75]"
              >
                <Hash />
              </span>
              <span className="truncate">{tag.name}</span>
            </div>
          ))}
          {!matches.length && (
            <p className="m-0 px-2.5 py-1.5 text-muted-foreground text-small">
              {tags.length ? t("noMatch") : t("noTags")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
