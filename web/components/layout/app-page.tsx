"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Archive,
  Hash,
  Menu,
  NotebookPen,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { IconButton } from "@/components/ui/button";
import { menuSurface } from "@/components/ui/dropdown-menu";
import { Tip } from "@/components/ui/tooltip";
import {
  chordText,
  useCommand,
  useContextKey,
  useKeysFor,
} from "@/features/keybindings";
import { tagColorStyle } from "@/features/tags";
import { pushInPage } from "@/lib/in-page-nav";
import { isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { DesktopUpdateButton } from "./desktop-update";
import { type GoToTarget, matchTargets, useGoToTargets } from "./go-to";
import { useShellStore } from "./shell-store";

const scrollMemory = new Map<string, number>();

const PAGE_ICONS: Record<string, typeof Search> = {
  "/notes": NotebookPen,
  "/archive": Archive,
  "/trash": Trash2,
};

interface AppPageProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  scrollKey?: string;
  className?: string;
  children: React.ReactNode;
}

export function AppPage({
  title,
  actions,
  scrollKey,
  className,
  children,
}: AppPageProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !scrollKey) return;
    const savedTop = scrollMemory.get(scrollKey);
    if (savedTop) el.scrollTop = savedTop;
    return () => {
      scrollMemory.set(scrollKey, el.scrollTop);
    };
  }, [scrollKey]);

  return (
    <div
      ref={scrollRef}
      data-slot="page-scroll"
      onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
      className="min-h-0 flex-1 scroll-pt-16 overflow-auto scrollbar-slim scrollbar-gutter-stable"
    >
      <header
        data-scrolled={scrolled || undefined}
        className="sticky top-0 z-(--z-sticky) flex min-h-16 items-center gap-2.5 px-gutter pt-3 pb-2.5 transition-[background-color,box-shadow] duration-(--duration-fade) data-scrolled:bg-background/84 data-scrolled:shadow-[0_1px_0_color-mix(in_srgb,var(--border)_55%,transparent)] data-scrolled:backdrop-blur-[14px] data-scrolled:backdrop-saturate-130 max-md:min-h-14 max-md:gap-1 max-md:px-gutter-phone max-md:pt-2.5 max-md:pb-2"
      >
        <MenuButton />
        {/* Whole up to half the bar; the search box gives way first. */}
        <div className="flex min-w-0 max-w-1/2 flex-none items-center max-md:max-w-none max-md:flex-initial">
          {title}
        </div>
        {actions && (
          <div className="ml-auto flex min-w-0 items-center gap-1.5">
            {actions}
          </div>
        )}
        <DesktopUpdateButton className={actions ? undefined : "ml-auto"} />
      </header>
      <div
        className={cn(
          "grid min-w-0 content-start gap-3.5 px-gutter pt-1.5 pb-10 max-md:px-gutter-phone max-md:pt-1 max-md:pb-24 *:min-w-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function MenuButton() {
  const t = useTranslations("layout.appPage");
  const setDrawer = useShellStore((s) => s.setDrawer);
  return (
    <IconButton
      label={t("openMenu")}
      onClick={() => setDrawer(true)}
      className="-ml-1.5 lg:hidden"
    >
      <Menu />
    </IconButton>
  );
}

export function PageTitle({
  count,
  icon,
  className,
  children,
}: {
  count?: number;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h1
      className={cn(
        "m-0 flex min-w-0 items-center gap-2 whitespace-nowrap text-page max-md:text-page-phone",
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span className="ml-0.5 font-medium text-muted-foreground text-ui tracking-normal tabular-nums">
          {count}
        </span>
      )}
    </h1>
  );
}

const topButtonVariants = cva(
  "inline-flex h-9.5 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border-0 px-3 font-medium text-control transition-colors duration-(--duration-hover) max-md:h-10 max-md:min-w-10 max-md:px-2.5 [&_svg]:size-4.25",
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-muted-foreground hover:bg-foreground/6 hover:text-foreground aria-expanded:bg-foreground/6 aria-expanded:text-foreground aria-pressed:bg-foreground aria-pressed:text-card aria-pressed:shadow-xs",
        primary:
          "bg-foreground font-semibold text-card hover:bg-[color-mix(in_srgb,var(--foreground)_88%,var(--card))]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function TopBarButton({
  icon,
  className,
  variant,
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof topButtonVariants> & {
    icon?: React.ReactNode;
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="top-bar-button"
      type={asChild ? undefined : "button"}
      className={cn(topButtonVariants({ variant }), className)}
      {...props}
    >
      {icon}
      {children && (
        <span className="max-md:sr-only in-[.notes-pane]:sr-only">
          {children}
        </span>
      )}
    </Comp>
  );
}

export const SearchField = React.forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
    autoFocus?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
  }
>(
  (
    { value, onChange, placeholder, className, autoFocus, onFocus, onBlur },
    forwardedRef,
  ) => {
    const t = useTranslations("layout.appPage");
    const tc = useTranslations("common");
    const input = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(
      forwardedRef,
      () => input.current as HTMLInputElement,
    );
    // A search brought back from the address stays shown on phones.
    const [open, setOpen] = React.useState(() => !!value);
    // Pages and tags whose names match, above the notes: Enter goes there,
    // as a quick switcher does.
    const router = useRouter();
    const targets = useGoToTargets({ pages: true });
    const [isFocused, setIsFocused] = React.useState(false);
    const [active, setActive] = React.useState(0);
    const listId = React.useId();
    const places = isFocused ? matchTargets(targets, value).slice(0, 6) : [];
    const place = places[Math.min(active, places.length - 1)];
    const goTo = (target: GoToTarget) => {
      input.current?.blur();
      if (!pushInPage(target.href)) router.push(target.href);
    };

    // At once where the field is shown, so letters typed right after the key
    // land in it; on a phone it shows first.
    const openField = React.useCallback(() => {
      setOpen(true);
      const select = () => {
        input.current?.focus();
        input.current?.select();
      };
      if (input.current?.getClientRects().length) select();
      else requestAnimationFrame(select);
    }, []);

    useCommand("app.search", openField);
    // The hint shows a key with a modifier, which works from any field.
    const searchKey = useKeysFor()("app.search").find((k) => k.includes("+"));
    useContextKey("searchField", true);

    React.useEffect(() => {
      if (!autoFocus) return;
      setOpen(true);
      requestAnimationFrame(() => input.current?.focus());
    }, [autoFocus]);

    return (
      <>
        <label
          data-search-field
          data-open={open || undefined}
          className={cn(
            "group/search relative flex h-9.5 w-75 min-w-0 max-w-full items-center gap-2 rounded-md bg-card pr-2 pl-3 shadow-[inset_0_0_0_1px_var(--input),var(--sh-xs)] transition-[box-shadow,width] duration-(--duration-header) ease-standard focus-within:w-90 focus-within:shadow-[inset_0_0_0_2px_var(--ring)] max-md:hidden max-md:data-open:absolute max-md:data-open:inset-x-3 max-md:data-open:top-2 max-md:data-open:z-(--z-raised) max-md:data-open:flex max-md:data-open:w-auto [&>svg]:size-4 [&>svg]:text-muted-foreground",
            className,
          )}
        >
          <Search aria-hidden />
          <input
            ref={input}
            type="search"
            value={value}
            placeholder={placeholder}
            aria-label={placeholder}
            role="combobox"
            aria-expanded={places.length > 0}
            aria-controls={listId}
            aria-activedescendant={place ? `${listId}-${place.id}` : undefined}
            onChange={(e) => {
              onChange(e.target.value);
              setActive(0);
            }}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setIsFocused(false);
              if (!value) setOpen(false);
              onBlur?.();
            }}
            onKeyDown={(e) => {
              if (place && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                e.preventDefault();
                const step = e.key === "ArrowDown" ? 1 : -1;
                setActive((i) => (i + step + places.length) % places.length);
                return;
              }
              if (place && e.key === "Enter") {
                e.preventDefault();
                goTo(place);
                return;
              }
              if (e.key !== "Escape") return;
              if (value) {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              } else e.currentTarget.blur();
            }}
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-foreground text-ui outline-none placeholder:text-muted-foreground focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {value ? (
            <Tip label={t("clearSearch")}>
              <button
                type="button"
                aria-label={t("clearSearch")}
                onClick={() => {
                  onChange("");
                  input.current?.focus();
                }}
                className="grid size-6 flex-none cursor-pointer place-items-center rounded-sm bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-3.5"
              >
                <X />
              </button>
            </Tip>
          ) : searchKey ? (
            <kbd aria-hidden className="group-focus-within/search:hidden">
              {chordText(searchKey, isMac())}
            </kbd>
          ) : null}
          {places.length > 0 && (
            <div
              id={listId}
              role="listbox"
              aria-label={t("goTo")}
              className={cn(
                menuSurface,
                "absolute inset-x-0 top-full z-(--z-popover) mt-1.5 grid gap-px rounded-menu p-1.5",
              )}
            >
              {places.map((target) => {
                const Icon = target.isTag
                  ? Hash
                  : (PAGE_ICONS[target.href] ?? Settings);
                return (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: the search field's arrows and Enter pick it (aria-activedescendant)
                  <div
                    key={target.id}
                    id={`${listId}-${target.id}`}
                    role="option"
                    aria-selected={target === place}
                    tabIndex={-1}
                    style={
                      target.isTag ? tagColorStyle(target.color) : undefined
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goTo(target)}
                    className={cn(
                      "flex min-h-8.5 cursor-pointer items-center gap-2.5 rounded-menu-item px-2.5 text-foreground text-ui [&>svg]:size-3.75 [&>svg]:flex-none",
                      target.isTag
                        ? "tag-color [&>svg]:stroke-[2.75] [&>svg]:text-(--hash)"
                        : "[&>svg]:text-muted-foreground",
                      target === place && "bg-foreground/6",
                    )}
                  >
                    <Icon aria-hidden />
                    <span className="truncate">{target.name}</span>
                    <span className="ml-auto text-muted-foreground text-small">
                      {target.isTag ? t("tag") : t("page")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </label>
        <IconButton
          label={tc("search")}
          className="hidden max-md:inline-grid"
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => input.current?.focus());
          }}
        >
          <Search />
        </IconButton>
      </>
    );
  },
);
SearchField.displayName = "SearchField";

export function Fab({
  label,
  asChild,
  className,
  children,
  ...rest
}: React.ComponentProps<"button"> & { label: string; asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      aria-label={label}
      className={cn(
        "absolute right-5 bottom-6 z-(--z-float) hidden size-14 cursor-pointer place-items-center rounded-fab border-0 bg-foreground text-card shadow-fab max-md:grid [&_svg]:size-6",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}
