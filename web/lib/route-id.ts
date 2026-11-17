import { usePathname } from "next/navigation";

/**
 * The id in an address like /notes/<id> or /s/<token>, read from the address
 * itself.
 *
 * Don't use useParams() for this: the production build is static and has one
 * page for every note (built as /notes/new) and one for every share link
 * (/s/none), so useParams() returns "new" or "none" there, while `pnpm dev`
 * returns the real id. biome.json bans it.
 */
export function routeId(pathname: string, section: string): string {
  const prefix = `/${section}/`;
  if (!pathname.startsWith(prefix)) return "";
  const segment = pathname.slice(prefix.length).split("/")[0];
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function useRouteId(section: "notes" | "s"): string {
  return routeId(usePathname() ?? "", section);
}
