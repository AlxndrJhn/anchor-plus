"use client";

import { Bell, Filter, Hash, Image, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { TopBarButton } from "@/components/layout/app-page";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTags } from "@/features/tags/hooks";
import { tagColorStyle } from "@/features/tags/utils";
import { BACKGROUNDS } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";
import type { NoteList } from "../hooks/use-note-list";
import type { NoteFilters } from "../note-filters";
import { useBackgroundName } from "./background-picker";

const headingClass = "m-0 mb-2 text-label text-muted-foreground uppercase";

const KINDS: {
  key: "picture" | "checklist" | "reminder";
  label: "pictures" | "checklists" | "reminders";
  icon: React.ReactNode;
}[] = [
  { key: "picture", label: "pictures", icon: <Image aria-hidden /> },
  { key: "checklist", label: "checklists", icon: <ListChecks aria-hidden /> },
  { key: "reminder", label: "reminders", icon: <Bell aria-hidden /> },
];

const BACKGROUND_CHOICES = [
  ...BACKGROUNDS.colors.filter((b) => b.id !== null),
  ...BACKGROUNDS.patterns,
] as { id: string; name: string }[];

const chipClass =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-border border-solid bg-card px-3 text-ui text-foreground transition-colors duration-(--duration-hover) hover:bg-muted aria-pressed:border-transparent aria-pressed:bg-foreground aria-pressed:text-card [&_svg]:size-4";

/** Narrows the list to notes with a colour, a tag, pictures, checklists or reminders. */
export function FilterMenu({
  list,
  showTags = true,
}: {
  list: NoteList;
  /** Off in a tag's own view, which is already one tag. */
  showTags?: boolean;
}) {
  const t = useTranslations("notes.filterMenu");
  const backgroundName = useBackgroundName();
  const { filters, activeFilters } = list;
  const { data: tags = [] } = useTags();
  const set = (patch: Partial<NoteFilters>) =>
    list.setFilters({ ...filters, ...patch });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <TopBarButton
          icon={<Filter aria-hidden />}
          aria-pressed={activeFilters > 0}
          aria-label={
            activeFilters
              ? t("filterActiveLabel", { count: activeFilters })
              : t("filterNotes")
          }
        >
          {activeFilters
            ? t("filterActive", { count: activeFilters })
            : t("filter")}
        </TopBarButton>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={t("filterNotes")}
        className="grid w-76 max-w-[calc(100vw-2rem)] gap-3.5 p-3.5"
      >
        <div>
          <h2 className={headingClass}>{t("has")}</h2>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((kind) => (
              <button
                key={kind.key}
                type="button"
                aria-pressed={!!filters[kind.key]}
                className={chipClass}
                onClick={() => set({ [kind.key]: !filters[kind.key] })}
              >
                {kind.icon}
                {t(kind.label)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className={headingClass}>{t("colour")}</h2>
          <div className="grid grid-cols-6 gap-2">
            {BACKGROUND_CHOICES.map((background) => {
              const chosen = filters.background === background.id;
              return (
                <button
                  key={background.id}
                  type="button"
                  aria-pressed={chosen}
                  aria-label={backgroundName(background)}
                  title={backgroundName(background)}
                  data-note={background.id}
                  onClick={() =>
                    set({ background: chosen ? undefined : background.id })
                  }
                  className={cn(
                    "aspect-square max-w-full cursor-pointer rounded-lg border border-note-border bg-note bg-(image:--note-image) bg-size-[20px_20px] p-0 transition-[transform,box-shadow] duration-(--duration-hover) ease-standard hover:-translate-y-px",
                    chosen &&
                      "shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--ring)]",
                  )}
                />
              );
            })}
          </div>
        </div>

        {showTags && tags.length > 0 && (
          <div>
            <h2 className={headingClass}>{t("tag")}</h2>
            <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
              {tags.map((tag) => {
                const chosen = filters.tagId === tag.id;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={chosen}
                    className={chipClass}
                    onClick={() => set({ tagId: chosen ? undefined : tag.id })}
                  >
                    <span
                      aria-hidden
                      style={tagColorStyle(tag.color)}
                      className="tag-color inline-grid text-(--hash) [&_svg]:size-3.5 [&_svg]:stroke-[2.75]"
                    >
                      <Hash />
                    </span>
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeFilters > 0 && (
          <Button
            variant="secondary"
            className="justify-self-start"
            onClick={() => list.setFilters({})}
          >
            {t("clearFilters")}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
