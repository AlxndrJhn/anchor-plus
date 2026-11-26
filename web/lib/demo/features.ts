// Features the demo build can't play, because they need a server or another
// app. /demos lists them under the feature demos, each at
// /demos#feature-<slug>. Their words are in messages/<locale>/demos.json,
// under features.<slug>: a title, a summary and, with a link, its label.

export interface Feature {
  slug: string;
  /** Why there's no demo of it. */
  needs: "server" | "android" | "desktop";
  /** Where to get it, if somewhere else. */
  href?: string;
}

export const features: Feature[] = [
  { slug: "mcp", needs: "server" },
  { slug: "sync", needs: "server" },
  { slug: "sharing", needs: "server" },
  { slug: "picture-text-search", needs: "server" },
  { slug: "picture-search", needs: "server" },
  { slug: "oidc", needs: "server" },
  { slug: "reminders", needs: "android" },
  { slug: "share-to", needs: "android" },
  {
    slug: "desktop-app",
    needs: "desktop",
    href: "https://github.com/AlxndrJhn/anchor-plus/releases/latest",
  },
];
