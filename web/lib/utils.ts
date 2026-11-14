import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { TAILWIND_THEME } from "@/lib/design/tokens";

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

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

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
  const tenths = (value: number) => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * MB) return `${tenths(bytes / MB)} MB`;
  return `${tenths(bytes / (1024 * MB))} GB`;
}
