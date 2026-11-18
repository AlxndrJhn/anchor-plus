import { useEffect } from "react";

/** Gives every theme-color tag the page's background as it's drawn now. */
export function applyThemeColor() {
  const color = getComputedStyle(document.body).backgroundColor;
  if (!color) return;
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )) {
    if (meta.content !== color) meta.content = color;
  }
}

/**
 * Keeps the browser's theme color, and so an installed app's window, on the
 * chosen theme, scheme and custom theme. Only the two tags in the
 * root layout would follow the system's light or dark, not the app's.
 */
export function useThemeColor() {
  useEffect(() => {
    applyThemeColor();
    const observer = new MutationObserver(applyThemeColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-scheme", "data-custom-theme"],
    });
    // A custom theme's colours are a style element's text.
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, []);
}
