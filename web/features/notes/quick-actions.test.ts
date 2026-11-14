import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETUPS,
  decodeSetup,
  encodeSetup,
  MAX_BAR,
  moreGroups,
  QUICK_ACTIONS,
  tidySetup,
} from "./quick-actions";

describe("quick actions", () => {
  it("start as the defaults until changed", () => {
    expect(tidySetup(undefined, "narrow").bar).toEqual([
      "trash",
      "pin",
      "archive",
    ]);
    expect(tidySetup(undefined, "wide")).toEqual(DEFAULT_SETUPS.wide);
  });

  it("drop unknown and repeated names, fit the bar, and are never both", () => {
    expect(
      tidySetup(
        { bar: ["send", "nonsense", "pin", "send"], hidden: ["pin", "copy"] },
        "narrow",
      ),
    ).toEqual({ bar: ["send", "pin"], hidden: ["copy"] });
    expect(tidySetup({ bar: QUICK_ACTIONS }, "narrow").bar).toHaveLength(
      MAX_BAR.narrow,
    );
  });

  it("leave the bar and the actions turned off out of More", () => {
    const groups = moreGroups(DEFAULT_SETUPS.wide);
    expect(groups[0]).toEqual(["addImage", "takePicture"]);
    expect(groups.flat()).not.toContain("takeSeveral");
    expect(groups.flat()).not.toContain("trash");
    expect(groups.at(-1)).toEqual(["history", "lock", "freeze"]);
  });

  it("drop actions that were removed from a saved setup", () => {
    expect(
      tidySetup({ bar: ["invisible", "pin"], hidden: ["invisible"] }, "wide"),
    ).toEqual({ bar: ["pin"], hidden: [] });
    expect(
      decodeSetup("anchor-quick-actions 1\nbar: invisible,pin\noff:", "wide"),
    ).toEqual({ bar: ["pin"], hidden: [] });
  });

  it("copy and paste as the Android app does", () => {
    const setup = { bar: ["pin", "send"], hidden: ["freeze"] } as const;
    const text = encodeSetup({
      bar: [...setup.bar],
      hidden: [...setup.hidden],
    });
    expect(text).toBe("anchor-quick-actions 1\nbar: pin,send\noff: freeze");
    expect(decodeSetup(text, "wide")).toEqual(setup);
    expect(
      decodeSetup(
        "anchor-quick-actions 1\r\nbar: pin\r\noff: pin, copy",
        "wide",
      ),
    ).toEqual({ bar: ["pin"], hidden: ["copy"] });
    expect(decodeSetup("bar: pin", "wide")).toBeNull();
    expect(decodeSetup(null, "wide")).toBeNull();
  });
});
