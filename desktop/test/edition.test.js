const test = require("node:test");
const assert = require("node:assert/strict");
const { editionOf, windowTitle } = require("../src/edition");

test("an Anchor+ server says so in its health answer", () => {
  assert.equal(editionOf({ app: "anchor", edition: "anchor-plus" }), "plus");
});

test("a server that doesn't say is a regular Anchor server", () => {
  assert.equal(editionOf({ app: "anchor", version: "0.18.0" }), "regular");
  assert.equal(editionOf(null), "regular");
});

test("the window names a regular server, and nothing else", () => {
  assert.equal(windowTitle("Anchor+", "plus"), "Anchor+");
  assert.equal(windowTitle("Anchor+", undefined), "Anchor+");
  assert.equal(windowTitle("Anchor+", "regular"), "Anchor+ · Regular Anchor server");
});
