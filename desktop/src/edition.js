// Anchor+ servers answer /api/health with edition "anchor-plus"; a regular
// Anchor server leaves it out. The app works with both, but on a regular
// server the window shows that server's own web client, without Anchor+'s
// features, so it says so.

const ANCHOR_PLUS_EDITION = "anchor-plus";

/** "plus" or "regular", from a /api/health answer. */
function editionOf(health) {
  return health && health.edition === ANCHOR_PLUS_EDITION ? "plus" : "regular";
}

/** The window's title: the app's name, and what the server lacks. */
function windowTitle(appName, edition) {
  return edition === "regular" ? `${appName} · Regular Anchor server` : appName;
}

const REGULAR_SERVER_DETAIL =
  "This server runs Anchor, not Anchor+, so the window shows its own web client. " +
  "Notes, tags, reminders and sharing work as usual, but Anchor+'s own features " +
  "(locked and frozen notes, live editing together, live pictures, share links, " +
  "picture search, your own note order and more) aren't there.\n\n" +
  "Notes kept on this computer without a server stay in the built-in web client " +
  "(“Use without a server”); move them with an Anchor backup.";

module.exports = { ANCHOR_PLUS_EDITION, editionOf, windowTitle, REGULAR_SERVER_DETAIL };
