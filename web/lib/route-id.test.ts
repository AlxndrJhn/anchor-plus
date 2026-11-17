import { describe, expect, it } from "vitest";
import { routeId } from "./route-id";

describe("routeId", () => {
  it.each([
    ["/notes/7912001d-aa", "notes", "7912001d-aa"],
    ["/notes/new", "notes", "new"],
    ["/notes/a%20b", "notes", "a b"],
    ["/notes/abc/", "notes", "abc"],
    ["/s/xYz123", "s", "xYz123"],
    ["/s/bad%E0", "s", "bad%E0"],
    ["/notes", "notes", ""],
    ["/settings", "notes", ""],
  ])("%s in %s → %s", (pathname, section, id) => {
    expect(routeId(pathname, section)).toBe(id);
  });
});
