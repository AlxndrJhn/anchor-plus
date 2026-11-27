import Link from "next/link";
import { followInPage } from "@/lib/in-page-nav";
import { cn } from "@/lib/utils";
import { AnchorLogo } from "./anchor-logo";
import { PlusMark } from "./plus-mark";

const wordmarkClass =
  "whitespace-nowrap font-bold font-serif text-[19px] tracking-[-.005em]";

export function Brand({
  href,
  className,
  nameClassName,
  isBurstOnShow = false,
  onNavigate,
}: {
  href?: string;
  className?: string;
  nameClassName?: string;
  /** Plays the +'s features once when it first shows, where it shows
   * seldom, like signing in. */
  isBurstOnShow?: boolean;
  onNavigate?: () => void;
}) {
  const content = (
    <>
      <AnchorLogo className="size-7" />
      <span
        data-slot="brand-name"
        className={cn(wordmarkClass, "inline-flex items-start", nameClassName)}
      >
        Anchor<span className="sr-only">+</span>
        <PlusMark
          size={11}
          isBurstOnShow={isBurstOnShow}
          className="mt-[0.36em] ml-[3px]"
        />
      </span>
    </>
  );
  const classes = cn(
    "flex min-w-0 flex-1 items-center gap-2 rounded-sm text-inherit no-underline",
    className,
  );
  return href ? (
    <Link
      href={href}
      className={classes}
      onClick={(e) => {
        followInPage(e, href);
        onNavigate?.();
      }}
    >
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  );
}
