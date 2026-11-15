import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { TAILWIND_THEME } from "@/lib/design/tokens";
import { currentLocale } from "@/lib/i18n/messages";

// tailwind-merge must know the theme's names, or text-meta is taken for a color.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: TAILWIND_THEME.text,
      spacing: TAILWIND_THEME.spacing,
      radius: TAILWIND_THEME.radius,
      shadow: TAILWIND_THEME.shadow,
      ease: TAILWIND_THEME.ease,
      "font-weight": TAILWIND_THEME["font-weight"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const firstName = (name: string) => name.split(" ")[0];

/** First names, or the whole name where two people share a first name. */
export function shortNames(names: string[]) {
  const firsts = names.map(firstName);
  return names.map((name, i) =>
    firsts.indexOf(firsts[i]) === firsts.lastIndexOf(firsts[i])
      ? firsts[i]
      : name,
  );
}

/** “820 KB”, “3.4 MB”, “250 MB”, “20 GB”: how much is stored. */
export function storageSize(bytes: number) {
  const MB = 1024 * 1024;
  // 3.4 MB, or 3,4 MB in German and Polish.
  const tenths = (value: number) =>
    new Intl.NumberFormat(currentLocale(), {
      maximumFractionDigits: 1,
    }).format(value);
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * MB) return `${tenths(bytes / MB)} MB`;
  return `${tenths(bytes / (1024 * MB))} GB`;
}
