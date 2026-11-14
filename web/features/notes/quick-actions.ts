// What an open note offers: in its bar beside More, in More, or neither. The
// names are the Android app's, so a setup copied there pastes here.

export type QuickAction =
  | "pin"
  | "reminder"
  | "addImage"
  | "takePicture"
  | "takeSeveral"
  | "checkboxes"
  | "uncheckAll"
  | "deleteChecked"
  | "sortByName"
  | "share"
  | "send"
  | "print"
  | "copy"
  | "history"
  | "background"
  | "lock"
  | "freeze"
  | "archive"
  | "trash";

/** More's groups, in order, as on Android. Edit quick actions ends it. */
export const MORE_GROUPS: readonly (readonly QuickAction[])[] = [
  ["pin", "reminder"],
  ["addImage", "takePicture", "takeSeveral"],
  ["checkboxes", "uncheckAll", "deleteChecked", "sortByName"],
  ["share", "send", "print", "copy"],
  ["history", "background", "lock", "freeze"],
  ["archive", "trash"],
];

/** Every action, in the order More and Settings list them. */
export const QUICK_ACTIONS: readonly QuickAction[] = MORE_GROUPS.flat();

/** The bar below 768px wide, and from there up. */
export type BarWidth = "narrow" | "wide";

export interface QuickActionSetup {
  /** In the bar beside More, in order. */
  bar: QuickAction[];
  /** Turned off: in neither the bar nor More. */
  hidden: QuickAction[];
}

export const DEFAULT_SETUPS: Record<BarWidth, QuickActionSetup> = {
  narrow: { bar: ["trash", "pin", "archive"], hidden: [] },
  wide: {
    bar: ["background", "reminder", "pin", "checkboxes", "archive", "trash"],
    hidden: ["takeSeveral"],
  },
};

/** As many as fit beside Back and More: on a narrow phone, and wide. */
export const MAX_BAR: Record<BarWidth, number> = { narrow: 5, wide: 8 };

const isQuickAction = (name: string): name is QuickAction =>
  (QUICK_ACTIONS as readonly string[]).includes(name);

/** Known actions once each, in the bar no more than fit, none both. */
export function tidySetup(
  setup: { bar?: readonly string[]; hidden?: readonly string[] } | undefined,
  width: BarWidth,
): QuickActionSetup {
  if (!setup) return DEFAULT_SETUPS[width];
  const known = (names: readonly string[] | undefined) => [
    ...new Set((names ?? []).filter(isQuickAction)),
  ];
  const bar = known(setup.bar).slice(0, MAX_BAR[width]);
  const hidden = known(setup.hidden).filter((a) => !bar.includes(a));
  return { bar, hidden };
}

/** More's groups for [setup]: what's neither in the bar nor turned off. */
export function moreGroups(setup: QuickActionSetup): QuickAction[][] {
  return MORE_GROUPS.map((group) =>
    group.filter((a) => !setup.bar.includes(a) && !setup.hidden.includes(a)),
  ).filter((group) => group.length > 0);
}

const HEADER = "anchor-quick-actions 1";

/** As copied to the clipboard, the same text the Android app copies. */
export function encodeSetup(setup: QuickActionSetup): string {
  return [
    HEADER,
    `bar: ${setup.bar.join(",")}`,
    `off: ${setup.hidden.join(",")}`,
  ].join("\n");
}

/** Null when [text] isn't a copied setup. */
export function decodeSetup(
  text: string | null | undefined,
  width: BarWidth,
): QuickActionSetup | null {
  const lines = text?.trim().split(/\r?\n/);
  if (!lines || lines[0]?.trim() !== HEADER) return null;
  const field = (name: string) => {
    for (const line of lines.slice(1)) {
      const at = line.indexOf(":");
      if (at >= 0 && line.slice(0, at).trim() === name)
        return line
          .slice(at + 1)
          .replaceAll(" ", "")
          .split(",")
          .filter(Boolean);
    }
    return [];
  };
  return tidySetup({ bar: field("bar"), hidden: field("off") }, width);
}
