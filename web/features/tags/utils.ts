import type * as React from "react";
import { TAG_COLORS } from "@/lib/design/tokens";
import { translate } from "@/lib/i18n";
import type { Tag } from "./types";

type TagColor = (typeof TAG_COLORS)[number];

function findTagColor(stored: string | null | undefined): TagColor | undefined {
  if (!stored) return undefined;
  const hex = stored.toUpperCase();
  return TAG_COLORS.find((c) => c.stored === hex);
}

/** Variables for the .tag-color class. */
export function tagColorStyle(
  stored: string | null | undefined,
): React.CSSProperties {
  const color = findTagColor(stored);
  return {
    "--hash-l": color?.hash.light ?? "var(--note-muted)",
    "--hash-d": color?.hash.dark ?? "var(--note-muted)",
    "--tint-l": color?.tintFill.light ?? "var(--card)",
    "--tint-d": color?.tintFill.dark ?? "var(--card)",
  } as React.CSSProperties;
}

/** A color's name for people: “Deep purple”. */
export function tagColorName(stored: string | null | undefined): string {
  const t = translate("settings.tags.colors");
  const color = findTagColor(stored);
  if (!color) return stored ?? t("none");
  if (t.has(color.name as "red")) return t(color.name as "red");
  const words = color.name.replace(/([A-Z])/g, " $1").toLowerCase();
  return words[0].toUpperCase() + words.slice(1);
}

const tagNameOrder = new Intl.Collator("en");

export const compareTagNames = (a: string, b: string): number =>
  tagNameOrder.compare(a, b);

export function sortTagsByName<T extends { name: string }>(
  tags: readonly T[],
): T[] {
  return [...tags].sort((a, b) => compareTagNames(a.name, b.name));
}

export function nextTagColor(tagCount: number): string {
  return TAG_COLORS[tagCount % TAG_COLORS.length].stored;
}

/** The tags in the order they were dragged; unplaced ones after, by name. */
export function orderTags<T extends Pick<Tag, "name" | "position">>(
  tags: readonly T[],
): T[] {
  return [...tags].sort(
    (a, b) =>
      (a.position ?? Number.POSITIVE_INFINITY) -
        (b.position ?? Number.POSITIVE_INFINITY) ||
      a.name.localeCompare(b.name),
  );
}

/** [items] with the one at [from] moved to [to]. */
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const moved = [...items];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item);
  return moved;
}
