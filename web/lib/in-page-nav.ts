import type * as React from "react";
import { basePath } from "@/lib/local-backend/mode";

/**
 * Goes to `href` without Next asking the server for the page first, when only
 * its query differs from the page on screen, like a tag of the notes and all
 * of them. Every page is drawn in the browser, so that round trip only made
 * the switch wait. Next follows the address through useSearchParams.
 * Returns whether it went; otherwise the caller navigates as usual.
 */
export function pushInPage(href: string): boolean {
  const target = new URL(href, window.location.href);
  const here = window.location.pathname.slice(basePath.length) || "/";
  if (target.origin !== window.location.origin || target.pathname !== here)
    return false;
  const next = `${basePath}${target.pathname}${target.search}${target.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}`)
    window.history.pushState(null, "", next);
  return true;
}

/** For a link's onClick: a plain click stays on the page, see pushInPage. */
export function followInPage(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.currentTarget.target === "_blank"
  )
    return;
  if (pushInPage(href)) event.preventDefault();
}
