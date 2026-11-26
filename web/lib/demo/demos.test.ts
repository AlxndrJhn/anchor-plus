import { describe, expect, it } from "vitest";
import { LOCALES, loadMessages, translate } from "@/lib/i18n";
import { setCurrentMessages } from "@/lib/i18n/messages";
import { demos } from "./demos";
import { features } from "./features";
import type { Step } from "./runner";
import { demoKey, featureKey } from "./text";

/** Every caption key a demo's steps show, `orElse` included. */
function captions(steps: Step[]): string[] {
  return steps.flatMap((step) => [
    ...("say" in step && step.say ? [step.say] : []),
    ...("orElse" in step && step.orElse ? captions([step.orElse]) : []),
  ]);
}

/** The controls the steps look up in the app's messages (see `ui`). */
function lookups(value: unknown, key = ""): (() => string)[] {
  if (typeof value === "function")
    return key === "run" ? [] : [value as () => string];
  if (Array.isArray(value)) return value.flatMap((item) => lookups(item));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => lookups(v, k));
  return [];
}

describe.each(LOCALES)("feature demos in %s", (locale) => {
  it("have their words", async () => {
    setCurrentMessages(locale, await loadMessages(locale));
    const t = translate("demos");
    const missing: string[] = [];
    const check = (key: ReturnType<typeof demoKey>) => {
      // A missing message comes back as its key.
      if (t(key) === `demos.${key}` || !t(key)) missing.push(key);
    };
    for (const demo of demos) {
      check(demoKey(demo.slug, "title"));
      check(demoKey(demo.slug, "summary"));
      check(demoKey(demo.slug, "outro"));
      for (const say of captions(demo.steps))
        check(demoKey(demo.slug, `say.${say}`));
    }
    for (const feature of features) {
      check(featureKey(feature.slug, "title"));
      check(featureKey(feature.slug, "summary"));
      if (feature.href) check(featureKey(feature.slug, "link"));
    }
    expect(missing).toEqual([]);
  });

  it("look controls up in the language on screen", async () => {
    setCurrentMessages(locale, await loadMessages(locale));
    const found = demos.flatMap((demo) => lookups(demo.steps).map((f) => f()));
    expect(found.length).toBeGreaterThan(40);
    for (const text of found) {
      expect(text).not.toMatch(/^[a-zA-Z]+(\.[a-zA-Z_]+)+$/);
      expect(text).not.toContain("{");
    }
  });
});
