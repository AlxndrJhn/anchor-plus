"use client";

import {
  Car,
  Clock,
  Coffee,
  Flag,
  Heart,
  Lightbulb,
  PawPrint,
  Search,
  Smile,
  Volleyball,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type Emoji,
  type EmojiCategoryId,
  type EmojiSection,
  groupEmojis,
  loadEmojiSkins,
  loadEmojis,
  saveEmojiSkins,
  searchEmojis,
} from "../../emoji-data";

const TAB_ICONS: Record<EmojiCategoryId, React.ReactNode> = {
  recent: <Clock />,
  people: <Smile />,
  nature: <PawPrint />,
  food: <Coffee />,
  activity: <Volleyball />,
  travel: <Car />,
  objects: <Lightbulb />,
  symbols: <Heart />,
  flags: <Flag />,
};

/** How long a press opens an emoji's skin tones, as on a phone. */
const LONG_PRESS_MS = 450;

interface SkinMenu {
  emoji: Emoji;
  left: number;
  top: number;
}

/**
 * Every emoji, as WhatsApp offers them: a search box, a tab per category
 * (and Recent), and one scrolling list whose tab lights up as it scrolls
 * by. Holding (or right-clicking) an emoji with skin tones offers them;
 * the one picked is remembered for that emoji.
 */
export function EmojiPicker({
  value,
  recent,
  onPick,
}: {
  /** The emoji picked now. */
  value: string;
  /** Recently used emojis, newest first. */
  recent: readonly string[];
  onPick: (unicode: string) => void;
}) {
  const t = useTranslations("editorMedia.emoji");
  const [all, setAll] = React.useState<Emoji[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<EmojiCategoryId>(
    recent.length ? "recent" : "people",
  );
  const [skins, setSkins] = React.useState<Record<string, string>>({});
  const [skinMenu, setSkinMenu] = React.useState<SkinMenu | null>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef<HTMLDivElement>(null);
  const press = React.useRef<{ timer: number; opened: boolean } | null>(null);

  React.useEffect(() => {
    setSkins(loadEmojiSkins());
    let cancelled = false;
    loadEmojis().then(
      (emojis) => !cancelled && setAll(emojis),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const byUnicode = React.useMemo(() => {
    const map = new Map<string, Emoji>();
    for (const emoji of all ?? []) {
      map.set(emoji.unicode, emoji);
      for (const skin of emoji.skins ?? []) map.set(skin.unicode, emoji);
    }
    return map;
  }, [all]);

  const sections = React.useMemo<EmojiSection[]>(() => {
    if (!all) return [];
    const grouped = groupEmojis(all);
    if (!recent.length) return grouped;
    const recentEmojis = recent.map(
      (unicode) =>
        // A recent one keeps the skin tone it was used with.
        ({
          ...(byUnicode.get(unicode) ?? { hexcode: unicode, label: unicode }),
          unicode,
          skins: undefined,
        }) as Emoji,
    );
    return [
      { id: "recent", label: "Recent", emojis: recentEmojis },
      ...grouped,
    ];
  }, [all, recent, byUnicode]);

  const results = React.useMemo(
    () => (all && query.trim() ? searchEmojis(all, query) : null),
    [all, query],
  );

  /** The emoji as shown: in the skin tone last picked for it. */
  const shown = (emoji: Emoji) => skins[emoji.hexcode] ?? emoji.unicode;

  const goTo = (id: EmojiCategoryId) => {
    setQuery("");
    setActive(id);
    // After the search results give way to the list.
    requestAnimationFrame(() => {
      const box = scroller.current;
      const section = box?.querySelector<HTMLElement>(`[data-section="${id}"]`);
      if (box && section) box.scrollTop = section.offsetTop;
    });
  };

  // The tab of the section at the top lights up while scrolling.
  const onScroll = () => {
    setSkinMenu(null);
    const box = scroller.current;
    if (!box || results) return;
    let current: EmojiCategoryId | null = null;
    for (const section of box.querySelectorAll<HTMLElement>("[data-section]"))
      if (section.offsetTop <= box.scrollTop + 8)
        current = section.dataset.section as EmojiCategoryId;
    if (current && current !== active) setActive(current);
  };

  const openSkins = (emoji: Emoji, button: HTMLElement) => {
    const around = frame.current?.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    if (!around) return;
    setSkinMenu({
      emoji,
      left: box.left + box.width / 2 - around.left,
      top: box.top - around.top,
    });
  };

  const pickSkin = (emoji: Emoji, unicode: string) => {
    const next = { ...skins, [emoji.hexcode]: unicode };
    if (unicode === emoji.unicode) delete next[emoji.hexcode];
    setSkins(next);
    saveEmojiSkins(next);
    setSkinMenu(null);
    onPick(unicode);
  };

  const emojiButton = (emoji: Emoji, key: string) => {
    const unicode = shown(emoji);
    const hasSkins = !!emoji.skins?.length;
    const endPress = () => {
      if (press.current) window.clearTimeout(press.current.timer);
    };
    return (
      <button
        key={key}
        type="button"
        aria-label={emoji.label}
        aria-pressed={value === unicode}
        aria-haspopup={hasSkins ? "menu" : undefined}
        title={emoji.label}
        className={cn(
          "relative grid aspect-square cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0 text-[22px] leading-none hover:bg-foreground/8",
          value === unicode &&
            "bg-foreground/8 shadow-[inset_0_0_0_1.5px_var(--note-muted)]",
          // A small corner mark: it has skin tones.
          hasSkins &&
            "after:absolute after:right-0.5 after:bottom-0.5 after:size-0 after:border-transparent after:border-r-4 after:border-r-note-muted/60 after:border-t-4 after:content-['']",
        )}
        onPointerDown={(e) => {
          if (!hasSkins || e.button !== 0) return;
          const button = e.currentTarget;
          press.current = {
            opened: false,
            timer: window.setTimeout(() => {
              if (press.current) press.current.opened = true;
              openSkins(emoji, button);
            }, LONG_PRESS_MS),
          };
        }}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => {
          if (!hasSkins) return;
          e.preventDefault();
          endPress();
          openSkins(emoji, e.currentTarget);
        }}
        onClick={() => {
          // The press that opened the skin tones doesn't also pick.
          if (press.current?.opened) {
            press.current = null;
            return;
          }
          press.current = null;
          onPick(unicode);
        }}
      >
        {unicode}
      </button>
    );
  };

  const grid = "grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-0.5";

  return (
    <div
      ref={frame}
      data-testid="emoji-picker"
      className="relative grid gap-2 rounded-md bg-note-surface/60 p-2 shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]"
      onPointerDown={(e) => {
        if (!(e.target as Element).closest("[data-skin-menu]"))
          setSkinMenu(null);
      }}
    >
      <label className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 shadow-[inset_0_0_0_1px_rgb(0_0_0/.08)]">
        <Search aria-hidden className="size-4 shrink-0 text-note-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSkinMenu(null);
            if (scroller.current) scroller.current.scrollTop = 0;
          }}
          onKeyDown={(e) => {
            // Escape empties the search before it closes the pad.
            if (e.key === "Escape" && query) {
              e.preventDefault();
              e.stopPropagation();
              setQuery("");
            }
          }}
          placeholder={t("search")}
          aria-label={t("search")}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-small outline-none placeholder:text-note-muted"
        />
      </label>
      <div
        className="flex justify-between gap-0.5"
        role="toolbar"
        aria-label={t("categories")}
      >
        {(recent.length ? (["recent"] as EmojiCategoryId[]) : [])
          .concat(sections.filter((s) => s.id !== "recent").map((s) => s.id))
          .map((id) => {
            const label = t(`category.${id}`);
            const isActive = !results && active === id;
            return (
              <button
                key={id}
                type="button"
                aria-label={label}
                title={label}
                aria-pressed={isActive}
                onClick={() => goTo(id)}
                className={cn(
                  "grid h-8 flex-1 cursor-pointer place-items-center rounded-md border-0 border-transparent border-b-2 bg-transparent p-0 text-note-muted hover:text-foreground [&_svg]:size-4.5",
                  isActive && "border-b-accent-strong text-foreground",
                )}
              >
                {TAB_ICONS[id]}
              </button>
            );
          })}
      </div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="relative h-52 overflow-y-auto overscroll-contain pr-1"
      >
        {failed ? (
          <p className="m-0 p-4 text-center text-note-muted text-small">
            {t("loadFailed")}
          </p>
        ) : !all ? (
          <p className="m-0 p-4 text-center text-note-muted text-small">
            {t("loading")}
          </p>
        ) : results ? (
          results.length ? (
            <div className={grid}>
              {results.map((emoji) => emojiButton(emoji, emoji.hexcode))}
            </div>
          ) : (
            <p className="m-0 p-4 text-center text-note-muted text-small">
              {t("none")}
            </p>
          )
        ) : (
          sections.map((section) => (
            <section
              key={section.id}
              data-section={section.id}
              aria-label={t(`category.${section.id}`)}
            >
              <h3 className="sticky top-0 z-1 m-0 bg-note-surface px-1 py-1 font-medium text-note-muted text-xs">
                {t(`category.${section.id}`)}
              </h3>
              <div className={grid}>
                {section.emojis.map((emoji) =>
                  emojiButton(emoji, `${section.id}-${emoji.unicode}`),
                )}
              </div>
            </section>
          ))
        )}
      </div>
      {skinMenu && (
        <div
          data-skin-menu
          role="menu"
          aria-label={t("skinTone", { emoji: skinMenu.emoji.label })}
          className="absolute z-10 flex -translate-x-1/2 -translate-y-full gap-0.5 rounded-full bg-popover p-1 shadow-[0_0_0_1px_var(--border),0_8px_24px_rgb(0_0_0/.18)]"
          style={{
            left: Math.min(
              Math.max(skinMenu.left, 120),
              (frame.current?.clientWidth ?? 240) - 120,
            ),
            top: skinMenu.top - 4,
          }}
        >
          {[skinMenu.emoji, ...(skinMenu.emoji.skins ?? [])].map((each) => (
            <button
              key={each.unicode}
              type="button"
              role="menuitem"
              aria-label={each.label}
              title={each.label}
              onClick={() => pickSkin(skinMenu.emoji, each.unicode)}
              className={cn(
                "grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-[22px] leading-none hover:bg-foreground/8",
                shown(skinMenu.emoji) === each.unicode && "bg-foreground/8",
              )}
            >
              {each.unicode}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
