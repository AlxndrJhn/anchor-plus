"use client";

import {
  ALargeSmall,
  CalendarPlus,
  Check,
  GripVertical,
  HardDrive,
  LayoutDashboard,
  LayoutGrid,
  PencilLine,
  Rows3,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { TopBarButton } from "@/components/layout/app-page";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import type { SortBy, SortOrder, ViewMode } from "@/features/preferences";
import { useRovingFocus } from "@/lib/hooks/use-roving-focus";
import { cn } from "@/lib/utils";

interface ViewOptionsProps {
  layout: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onLayout: (layout: ViewMode) => void;
  onSort: (sortBy: SortBy, sortOrder: SortOrder) => void;
  showPictures: boolean;
  onShowPictures: (show: boolean) => void;
}

type OrderLabel =
  | "newestFirst"
  | "oldestFirst"
  | "aToZ"
  | "zToA"
  | "largestFirst"
  | "smallestFirst";

const ORDER_OPTIONS: Record<SortBy, [SortOrder, OrderLabel][]> = {
  updatedAt: [
    ["desc", "newestFirst"],
    ["asc", "oldestFirst"],
  ],
  createdAt: [
    ["desc", "newestFirst"],
    ["asc", "oldestFirst"],
  ],
  title: [
    ["asc", "aToZ"],
    ["desc", "zToA"],
  ],
  size: [
    ["desc", "largestFirst"],
    ["asc", "smallestFirst"],
  ],
  // The order notes were dragged into has no other way round.
  custom: [],
};

const headingClass = "m-0 mb-2 text-label text-muted-foreground uppercase";

export function ViewOptions({
  layout,
  sortBy,
  sortOrder,
  onLayout,
  onSort,
  showPictures,
  onShowPictures,
}: ViewOptionsProps) {
  const t = useTranslations("notes.viewOptions");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <TopBarButton icon={<SlidersHorizontal aria-hidden />}>
          {t("view")}
        </TopBarButton>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={t("viewOptions")}
        className="grid w-68 gap-3 p-3"
      >
        <div>
          <h2 className={headingClass}>{t("layout")}</h2>
          <SegmentedControl
            variant="tiles"
            aria-label={t("layout")}
            value={layout}
            onValueChange={onLayout}
            options={[
              {
                value: "masonry",
                label: t("masonry"),
                icon: <LayoutDashboard aria-hidden />,
              },
              {
                value: "grid",
                label: t("grid"),
                icon: <LayoutGrid aria-hidden />,
              },
              { value: "list", label: t("list"), icon: <Rows3 aria-hidden /> },
            ]}
          />
        </div>
        <div>
          <h2 className={headingClass} id="sort-by">
            {t("sortBy")}
          </h2>
          <SortChoices sortBy={sortBy} onSort={onSort} />
        </div>
        {ORDER_OPTIONS[sortBy].length > 0 ? (
          <SegmentedControl
            full
            aria-label={t("order")}
            value={sortOrder}
            onValueChange={(order) => onSort(sortBy, order)}
            options={ORDER_OPTIONS[sortBy].map(([value, label]) => ({
              value,
              label: t(label),
            }))}
          />
        ) : (
          <p className="m-0 px-0.5 text-muted-foreground text-ui">
            {t("customHint")}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-0 border-border border-t border-solid pt-3 text-ui">
          <label htmlFor="cards-pictures" className="cursor-pointer">
            {t("picturesOnCards")}
          </label>
          <Switch
            id="cards-pictures"
            checked={showPictures}
            onCheckedChange={onShowPictures}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

const SORT_CHOICES = [
  ["updatedAt", "lastEdited", PencilLine],
  ["createdAt", "dateCreated", CalendarPlus],
  ["title", "title", ALargeSmall],
  ["size", "size", HardDrive],
  ["custom", "custom", GripVertical],
] as const;

function SortChoices({
  sortBy,
  onSort,
}: Pick<ViewOptionsProps, "sortBy" | "onSort">) {
  const t = useTranslations("notes.viewOptions");
  const roving = useRovingFocus<HTMLDivElement>({
    orientation: "both",
    selectsOnMove: true,
  });
  return (
    <div
      ref={roving.ref}
      role="radiogroup"
      aria-labelledby="sort-by"
      onFocus={roving.onFocus}
      onKeyDown={roving.onKeyDown}
      className="grid gap-px"
    >
      {SORT_CHOICES.map(([value, labelKey, Icon]) => {
        const selected = sortBy === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: menu-style rows in a radio group
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() =>
              !selected && onSort(value, value === "title" ? "asc" : "desc")
            }
            className={cn(
              "relative flex h-8.5 cursor-pointer items-center gap-2.5 rounded-menu-item border-0 bg-transparent px-2.5 text-left text-ui hover:bg-foreground/6 focus-visible:bg-foreground/6 focus-visible:outline-transparent focus-visible:after:absolute focus-visible:after:top-1/2 focus-visible:after:left-0.75 focus-visible:after:-mt-2 focus-visible:after:h-4 focus-visible:after:w-0.75 focus-visible:after:rounded-xs focus-visible:after:bg-accent-strong focus-visible:after:content-[''] [&>svg]:size-4 [&>svg]:text-muted-foreground",
              selected && "font-semibold",
            )}
          >
            <Icon aria-hidden />
            {t(labelKey)}
            {selected && (
              <Check aria-hidden className="ml-auto text-accent-strong!" />
            )}
          </button>
        );
      })}
    </div>
  );
}
