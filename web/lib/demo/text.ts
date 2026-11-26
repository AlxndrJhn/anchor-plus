// The words of the feature demos, in messages/<locale>/demos.json: each
// demo's under items.<slug>, each feature without one under features.<slug>.

import type { MessageKeys, NestedKeyOf } from "next-intl";
import type { Messages } from "@/lib/i18n";

type DemoMessages = Messages["demos"];

export type DemoKey = MessageKeys<DemoMessages, NestedKeyOf<DemoMessages>>;

type DemoPart = "title" | "summary" | "outro" | `say.${string}`;

/** A demo's title, summary, outro or step caption (`say.<key>`). */
export const demoKey = (slug: string, part: DemoPart) =>
  `items.${slug}.${part}` as DemoKey;

/** A feature's title, summary or link label. */
export const featureKey = (slug: string, part: "title" | "summary" | "link") =>
  `features.${slug}.${part}` as DemoKey;
