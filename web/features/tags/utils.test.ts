import { describe, expect, it } from "vitest";
import { sortTags, sortTagsByName } from "./utils";

const tag = (name: string) => ({ id: name, name });
const names = (tags: { name: string }[]) => tags.map((t) => t.name);

describe("sortTagsByName", () => {
  it("orders names alphabetically, ignoring case", () => {
    const tags = [tag("work"), tag("Bugs"), tag("apple")];

    expect(names(sortTagsByName(tags))).toEqual(["apple", "Bugs", "work"]);
  });

  it("keeps accented letters next to their plain ones", () => {
    const tags = [tag("zoo"), tag("Ethics"), tag("école")];

    expect(names(sortTagsByName(tags))).toEqual(["école", "Ethics", "zoo"]);
  });

  it("gives the order the phone's name_order_test expects", () => {
    const order = [
      "_misc",
      "-dash",
      "~inbox",
      "10",
      "1st",
      "2",
      "aero",
      "Ærø",
      "apple",
      "Bugs",
      "ecole",
      "Ecole",
      "école",
      "Ethics",
      "lodz",
      "łódź",
      "strasse",
      "straße",
      "to do",
      "to-do",
      "todo",
      "work",
      "Work",
      "zoo",
      "Ωmega",
      "москва",
      "日記",
    ];

    expect(names(sortTagsByName([...order].reverse().map(tag)))).toEqual(order);
  });

  it("leaves the list it was given as it was", () => {
    const tags = [tag("b"), tag("a")];

    sortTagsByName(tags);

    expect(names(tags)).toEqual(["b", "a"]);
  });
});

describe("sortTags", () => {
  const tags = [
    { name: "zebra", position: 0 },
    { name: "apple", position: 1 },
    { name: "mango", position: null },
  ];

  it("lists dragged tags in their order, the rest after by name", () => {
    expect(sortTags(tags, "custom").map((t) => t.name)).toEqual([
      "zebra",
      "apple",
      "mango",
    ]);
  });

  it("lists every tag by name when set to Name A–Z", () => {
    expect(sortTags(tags, "name").map((t) => t.name)).toEqual([
      "apple",
      "mango",
      "zebra",
    ]);
  });
});
