"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { useTagOrder, useTags } from "@/features/tags";

/** A page or tag a person can jump to by typing part of its name. */
export interface GoToTarget {
  id: string;
  /** What is matched and shown, without the # of a tag. */
  name: string;
  href: string;
  isTag: boolean;
  color?: string | null;
}

const PAGES = [
  { id: "page:notes", key: "notes", href: "/notes" },
  { id: "page:archive", key: "archive", href: "/archive" },
  { id: "page:trash", key: "trash", href: "/trash" },
  { id: "page:settings", key: "settings", href: "/settings" },
] as const;

const NO_TAGS: never[] = [];

/** The pages, if asked for, then the tags in the sidebar's order. */
export function useGoToTargets({ pages }: { pages: boolean }) {
  const t = useTranslations("common");
  const { data: tags = NO_TAGS } = useTags();
  const orderTags = useTagOrder();
  return React.useMemo(
    () => [
      ...(pages
        ? PAGES.map(
            (page): GoToTarget => ({
              id: page.id,
              name: t(page.key),
              href: page.href,
              isTag: false,
            }),
          )
        : []),
      ...orderTags(tags).map((tag) => ({
        id: `tag:${tag.id}`,
        name: tag.name,
        href: `/notes?tagId=${tag.id}`,
        isTag: true,
        color: tag.color,
      })),
    ],
    [pages, tags, t, orderTags],
  );
}

// Lower is better: the whole name, its start, a word's start, anywhere.
function rank(name: string, query: string) {
  const lower = name.toLocaleLowerCase();
  if (lower === query) return 0;
  if (lower.startsWith(query)) return 1;
  if (lower.split(/[^\p{L}\p{N}]+/u).some((w) => w.startsWith(query))) return 2;
  if (lower.includes(query)) return 3;
  return null;
}

/** Best first; a query starting with # finds only tags. */
export function matchTargets(
  targets: readonly GoToTarget[],
  query: string,
): GoToTarget[] {
  const raw = query.trim().toLocaleLowerCase();
  const onlyTags = raw.startsWith("#");
  const q = raw.replace(/^#+/, "");
  if (!q) return onlyTags ? targets.filter((t) => t.isTag) : [];
  return targets
    .map((target, order) => ({
      target,
      order,
      score: onlyTags && !target.isTag ? null : rank(target.name, q),
    }))
    .filter((m) => m.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || a.order - b.order)
    .map((m) => m.target);
}
