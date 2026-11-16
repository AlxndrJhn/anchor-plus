// Anchor+ desktop: a window onto the web client of the user's own Anchor
// server. Until one is set, it opens the web client built in, which keeps the
// notes on this computer; "Connect to a server…" asks for one, and after that
// the app opens it straight away.

const {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  Menu,
  ipcMain,
  net,
  powerMonitor,
  protocol,
  safeStorage,
  screen,
  session,
  shell,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { headersError, headersFor, isToServer } = require("./headers");
const { startUpdater } = require("./updater");
const { REPOSITORY, sourceCodeUrl, licenseUrl } = require("./legal");
const { anchorBuild } = require("../package.json");
const { allowScreenSharing } = require("./screen-picker");
const { editionOf, windowTitle, REGULAR_SERVER_DETAIL } = require("./edition");

// The name the window, menu and About panel show, and the settings folder's.
const APP_NAME = "Anchor+";
const SETUP_PAGE = path.join(__dirname, "setup.html");
const SETUP_URL = pathToFileURL(SETUP_PAGE).toString();
const HEALTH_TIMEOUT_MS = 10_000;

// The web client built without a server (web: pnpm build:local), packaged in
// web/. It is served from its own origin, so its notes (IndexedDB) have one
// to stay in.
const LOCAL_SCHEME = "anchor-app";
const LOCAL_ORIGIN = `${LOCAL_SCHEME}://notes`;
const LOCAL_URL = `${LOCAL_ORIGIN}/`;

protocol.registerSchemesAsPrivileged([
  {
    scheme: LOCAL_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

app.setName(APP_NAME);
if (process.platform === "win32") app.setAppUserModelId("io.github.alxndrjhn.anchor");
moveOldUserData();

// Builds before the rename kept their settings and sign-in in an "Anchor"
// folder. Copy it once, before Chromium opens the new one, so an update keeps
// the saved server and sign-in; a pending update installer is not worth the
// copy. getPath("userData") creates the folder, so it always exists here:
// Chromium's "Local State" tells a folder that has been used before.
function moveOldUserData() {
  const userData = app.getPath("userData");
  const old = path.join(app.getPath("appData"), "Anchor");
  if (fs.existsSync(path.join(userData, "Local State")) || !fs.existsSync(old)) return;
  try {
    fs.cpSync(old, userData, {
      recursive: true,
      filter: (src) => src !== path.join(old, "updates"),
    });
  } catch (err) {
    console.error("Could not copy the old settings folder:", err);
  }
}

// --- Settings (userData/settings.json) -------------------------------------

const settingsFile = () => path.join(app.getPath("userData"), "settings.json");

function readSettings() {
  try {
    const data = JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

// Read before Chromium starts: the server's address sets one of its switches.
let settings = readSettings();

// Offline use, recording and the service worker need a secure page, and a
// server on the home network often has only http. Chromium's switch can only
// be set at start, so a newly chosen http server needs a restart.
function insecureOrigin(url) {
  try {
    const { origin, protocol } = new URL(url);
    return protocol === "http:" ? origin : null;
  } catch {
    return null;
  }
}
const secureAtStart = insecureOrigin(settings.serverUrl);
if (secureAtStart) app.commandLine.appendSwitch("unsafely-treat-insecure-origin-as-secure", secureAtStart);

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    const tmp = `${settingsFile()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
    fs.renameSync(tmp, settingsFile());
  } catch (err) {
    console.error("Could not save settings:", err);
  }
}

// --- Extra headers (settings.serverHeaders) ---------------------------------

// { server, text } as on Android, the text sealed with the system's keychain
// when it has one: they are often a proxy's secret.
function readHeaders() {
  const saved = settings.serverHeaders;
  if (!saved || typeof saved.server !== "string") return null;
  try {
    if (typeof saved.sealed === "string") {
      return { server: saved.server, text: safeStorage.decryptString(Buffer.from(saved.sealed, "base64")) };
    }
    if (typeof saved.text === "string") return { server: saved.server, text: saved.text };
  } catch (err) {
    console.error("Could not read the extra headers:", err);
  }
  return null;
}

function writeHeaders(server, text) {
  if (!String(text ?? "").trim()) {
    delete settings.serverHeaders;
  } else if (safeStorage.isEncryptionAvailable()) {
    settings.serverHeaders = { server, sealed: safeStorage.encryptString(text).toString("base64") };
  } else {
    settings.serverHeaders = { server, text };
  }
  savedHeaders = readHeaders();
}

// Read once ready (the keychain needs it), and on every change.
let savedHeaders = null;

// Every request to the server carries them: the pages, the API, the service
// worker's. They go to no other site, and not to another server's address.
function sendHeaders(targetSession) {
  targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (!isToServer(details.url, settings.serverUrl)) return callback({});
    const extra = headersFor(savedHeaders, settings.serverUrl);
    callback({ requestHeaders: { ...details.requestHeaders, ...extra } });
  });
}

// --- Server URL ------------------------------------------------------------

/** "notes.example.com/" -> "https://notes.example.com"; null if not a URL. */
function normalizeServerUrl(input) {
  let text = String(input ?? "").trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/+$/, "");
}

// The messages are the Android app's (serverNotAnchor, serverUnreachable…).
async function checkServer(serverUrl, { isSchemeAdded = false, headers = {} } = {}) {
  const host = new URL(serverUrl).host;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    // Not the window's session: its saved headers would replace these.
    const res = await session.fromPartition("anchor-check").fetch(`${serverUrl}/api/health`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { ...headers, Accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, error: `${host} answered ${res.status} ${res.statusText}. Check the address.` };
    }
    let body;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!body || body.app !== "anchor") {
      return { ok: false, error: `${host} isn’t an Anchor server. Check the address.` };
    }
    return {
      ok: true,
      version: typeof body.version === "string" ? body.version : null,
      image: typeof body.image === "string" ? body.image : null,
      edition: editionOf(body),
    };
  } catch (err) {
    const reason = controller.signal.aborted ? "It did not answer in time." : `${err.message}.`;
    const advice = isSchemeAdded
      ? "Check the address, or add http:// if your server doesn’t use https."
      : "Check the address and your connection.";
    return { ok: false, error: `Couldn’t reach ${host}. ${advice} (${reason})` };
  } finally {
    clearTimeout(timer);
  }
}

// Where the window's web client comes from: the server's, or the built-in one.
const serverOrigin = () => {
  if (!settings.serverUrl) return LOCAL_ORIGIN;
  try {
    return new URL(settings.serverUrl).origin;
  } catch {
    return null;
  }
};

// Node gives a scheme of its own the origin "null"; Chromium gives the
// built-in web client's its scheme and host.
const originOf = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === `${LOCAL_SCHEME}:`) return `${LOCAL_SCHEME}://${parsed.host}`;
    return parsed.origin;
  } catch {
    return null;
  }
};

function openExternal(url) {
  try {
    const { protocol } = new URL(url);
    if (["http:", "https:", "mailto:"].includes(protocol)) shell.openExternal(url);
  } catch {
    // Not a URL: ignore it.
  }
}

// --- Window ----------------------------------------------------------------

let mainWindow = null;
// What the setup page shows: why it is open, and whether Retry makes sense.
let setupState = { error: null, canRetry: false };

function iconPath() {
  const packaged = path.join(__dirname, "..", "icons", "web-app-manifest-any-512x512.png");
  if (fs.existsSync(packaged)) return packaged;
  return path.join(__dirname, "..", "..", "web", "public", "web-app-manifest-any-512x512.png");
}

function visibleBounds(saved) {
  const fallback = { width: 1200, height: 820 };
  if (!saved || !Number.isFinite(saved.width) || !Number.isFinite(saved.height)) return fallback;
  const bounds = {
    width: Math.max(400, Math.round(saved.width)),
    height: Math.max(300, Math.round(saved.height)),
  };
  if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
    // Only reuse the position if it is still on a connected screen.
    const area = screen.getDisplayMatching({ ...bounds, x: saved.x, y: saved.y }).workArea;
    const overlaps =
      saved.x < area.x + area.width - 50 &&
      saved.x + bounds.width > area.x + 50 &&
      saved.y < area.y + area.height - 50 &&
      saved.y >= area.y - 50;
    if (overlaps) Object.assign(bounds, { x: Math.round(saved.x), y: Math.round(saved.y) });
  }
  return bounds;
}

// At fractional display scaling the window comes out a few pixels off the
// bounds it was given. Taking that back off when saving keeps it from
// growing on every start.
let boundsDrift = {};

function rememberBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const maximized = mainWindow.isMaximized();
  const fullScreen = mainWindow.isFullScreen();
  // Keep the normal size, so un-maximizing next time restores it.
  const bounds = maximized || fullScreen ? mainWindow.getNormalBounds() : mainWindow.getBounds();
  for (const [key, drift] of Object.entries(boundsDrift)) bounds[key] -= drift;
  settings.window = { ...bounds, maximized };
  saveSettings();
}

function createWindow() {
  const saved = settings.window;
  const asked = visibleBounds(saved);
  mainWindow = new BrowserWindow({
    ...asked,
    minWidth: 400,
    minHeight: 300,
    title: currentTitle(),
    icon: iconPath(),
    show: false,
    backgroundColor: "#232838",
    autoHideMenuBar: process.platform !== "darwin",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
    },
  });
  const got = mainWindow.getBounds();
  boundsDrift = Object.fromEntries(Object.keys(asked).map((key) => [key, got[key] - asked[key]]));
  if (saved?.maximized) mainWindow.maximize();

  mainWindow.once("ready-to-show", () => mainWindow.show());
  // The window is always "Anchor+" (and says when the server is a regular
  // Anchor one), whatever the page calls itself.
  mainWindow.on("page-title-updated", (event) => event.preventDefault());

  let saveTimer = null;
  const saveSoon = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(rememberBounds, 500);
  };
  mainWindow.on("resize", saveSoon);
  mainWindow.on("move", saveSoon);
  mainWindow.on("close", () => {
    clearTimeout(saveTimer);
    rememberBounds();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // The mouse's back and forward buttons (Windows).
  mainWindow.on("app-command", (_event, command) => {
    if (command === "browser-backward") goInHistory(-1);
    else if (command === "browser-forward") goInHistory(1);
  });

  const contents = mainWindow.webContents;

  // A link to another site opens in the system browser. Navigating within
  // the current site stays (so a sign-in provider's own pages work), and
  // server redirects (OIDC sign-in) are not navigations, so they stay too.
  // file: pages all have the origin "null", so the setup page is not a site
  // other local pages may share.
  contents.on("will-navigate", (event, url) => {
    if (url === SETUP_URL) return;
    const target = originOf(url);
    const isSite = target && target !== "null";
    if (isSite && (target === serverOrigin() || target === originOf(contents.getURL()))) return;
    event.preventDefault();
    openExternal(url);
  });

  contents.setWindowOpenHandler(({ url }) => {
    const target = originOf(url);
    if (url.startsWith("blob:") || (target && target === serverOrigin())) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: { icon: iconPath(), autoHideMenuBar: true },
      };
    }
    openExternal(url);
    return { action: "deny" };
  });

  // The web client asks before a close or reload would drop changes not
  // saved yet. Electron then cancels it without a word, so ask here.
  contents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "warning",
      buttons: ["Leave", "Stay"],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      title: APP_NAME,
      message: "Leave with changes not saved yet?",
      detail: "Changes that haven’t reached the server may be lost.",
    });
    if (choice === 0) event.preventDefault();
  });

  // Loading the server failed (and its service worker could not serve the
  // app offline either): show the setup page with the error and a Retry.
  contents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    // -3 is ERR_ABORTED: a navigation that was replaced by another one.
    if (!isMainFrame || code === -3 || url === SETUP_URL) return;
    showSetup({
      error: settings.serverUrl
        ? `Could not open ${settings.serverUrl} (${description || `error ${code}`}). Check the connection and that the server is running.`
        : `Could not open the notes kept on this computer (${description || `error ${code}`}).`,
      canRetry: true,
    });
  });

  return mainWindow;
}

function showSetup(state = {}) {
  setupState = { error: state.error ?? null, canRetry: Boolean(state.canRetry) };
  mainWindow.loadFile(SETUP_PAGE);
}

// The server's web client, or the built-in one while there is no server.
// --- Regular Anchor servers --------------------------------------------------

// What the connected server is, as last seen: "regular" for an Anchor server
// without Anchor+'s features; unset for Anchor+ or no server.
const currentEdition = () => (settings.serverUrl ? settings.serverEdition : undefined);

const currentTitle = () => windowTitle(APP_NAME, currentEdition());

function rememberEdition(edition) {
  const value = edition === "regular" ? "regular" : undefined;
  if (settings.serverEdition === value) return;
  if (value) settings.serverEdition = value;
  else delete settings.serverEdition;
  saveSettings();
  mainWindow?.setTitle(currentTitle());
  buildMenu();
}

function explainRegularServer() {
  const host = settings.serverUrl ? new URL(settings.serverUrl).host : "This server";
  const options = {
    type: "info",
    title: APP_NAME,
    message: `${host} is a regular Anchor server`,
    detail: REGULAR_SERVER_DETAIL,
    buttons: ["OK"],
  };
  return mainWindow ? dialog.showMessageBox(mainWindow, options) : dialog.showMessageBox(options);
}

// The server may have changed since (to Anchor+, or back): asked once a start.
async function refreshEdition() {
  if (!settings.serverUrl) return;
  const server = await checkServer(settings.serverUrl, {
    headers: headersFor(savedHeaders, settings.serverUrl),
  });
  if (server.ok) rememberEdition(server.edition);
}

function openServer() {
  setupState = { error: null, canRetry: false };
  mainWindow.loadURL(settings.serverUrl || LOCAL_URL);
}

// The first start welcomes, with the choice of a server or none.
function start() {
  if (settings.serverUrl || settings.localOnly) openServer();
  else showSetup();
}

// --- The built-in web client (anchor-app://notes/) ---------------------------

function localWebRoot() {
  const packaged = path.join(__dirname, "..", "web");
  if (fs.existsSync(packaged)) return packaged;
  return path.join(__dirname, "..", "..", "web", "out");
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

// A static export: /settings is settings.html, and a page it doesn't have
// (a note's, /notes/<id>) is 404.html, which opens it.
function localFileFor(pathname) {
  const root = localWebRoot();
  let relative;
  try {
    relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return null;
  }
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  const candidates = [file, `${file}.html`, path.join(file, "index.html")];
  return candidates.find(isFile) ?? path.join(root, "404.html");
}

function serveLocal(request) {
  const file = localFileFor(new URL(request.url).pathname);
  if (!file || !isFile(file)) return new Response("Not found", { status: 404 });
  return net.fetch(pathToFileURL(file).toString());
}

// --- Setup page IPC (only the built-in page may use it) --------------------

function fromSetupPage(event) {
  return event.senderFrame?.url === SETUP_URL;
}

ipcMain.handle("anchor:get-state", (event) => {
  if (!fromSetupPage(event)) throw new Error("Not allowed");
  return {
    serverUrl: settings.serverUrl ?? "",
    hasServer: Boolean(settings.serverUrl),
    isFirstStart: !settings.serverUrl && !settings.localOnly,
    headers: savedHeaders?.text ?? "",
    error: setupState.error,
    canRetry: setupState.canRetry,
    version: app.getVersion(),
  };
});

ipcMain.handle("anchor:connect", async (event, input, headersText = "") => {
  if (!fromSetupPage(event)) throw new Error("Not allowed");
  const serverUrl = normalizeServerUrl(input);
  if (!String(input ?? "").trim()) return { ok: false, error: "Enter a server address." };
  if (!serverUrl) return { ok: false, error: "Enter a valid server address." };
  const headersProblem = headersError(headersText);
  if (headersProblem) return { ok: false, error: headersProblem, field: "headers" };
  const isSchemeAdded = !/^https?:\/\//i.test(String(input).trim());
  const headers = headersFor({ server: serverUrl, text: headersText }, serverUrl);
  const result = await checkServer(serverUrl, { isSchemeAdded, headers });
  if (!result.ok) return result;
  writeHeaders(serverUrl, headersText);
  const isRegular = result.edition === "regular";
  // The notes kept without a server move into the account once signed in;
  // only Anchor+'s web client takes them.
  if (!settings.serverUrl && settings.localOnly && !isRegular) await keepLocalNotesForMove();
  settings.serverUrl = serverUrl;
  if (isRegular) settings.serverEdition = "regular";
  else delete settings.serverEdition;
  saveSettings();
  mainWindow?.setTitle(currentTitle());
  buildMenu();
  if (isRegular) explainRegularServer();
  const origin = insecureOrigin(serverUrl);
  if (origin && origin !== secureAtStart) {
    app.relaunch();
    app.exit(0);
    return { ok: true };
  }
  openServer();
  return { ok: true };
});

ipcMain.handle("anchor:retry", (event) => {
  if (!fromSetupPage(event)) throw new Error("Not allowed");
  openServer();
  return { ok: true };
});

// Forgets the server: the built-in web client opens, with the notes it kept.
ipcMain.handle("anchor:use-local", (event) => {
  if (!fromSetupPage(event)) throw new Error("Not allowed");
  delete settings.serverUrl;
  delete settings.serverEdition;
  settings.localOnly = true;
  mainWindow?.setTitle(currentTitle());
  saveSettings();
  // They are still here; nothing is left to move.
  fs.rmSync(localNotesFile(), { force: true });
  buildMenu();
  openServer();
  return { ok: true };
});

// --- Moving the built-in client's notes into an account ---------------------

const localNotesFile = () => path.join(app.getPath("userData"), "local-notes.zip");

// The built-in client's notes as an Anchor backup, read in a hidden window,
// for the server's web client to import once signed in.
async function keepLocalNotesForMove() {
  const reader = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await reader.loadURL(LOCAL_URL);
    const bytes = await reader.webContents.executeJavaScript(
      `fetch("/api/export?format=anchor").then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => b && new Uint8Array(b))`,
    );
    if (bytes) fs.writeFileSync(localNotesFile(), Buffer.from(bytes));
  } catch (err) {
    console.error("Keeping the notes on this computer to move failed:", err);
  } finally {
    reader.destroy();
  }
}

// The server's web client, signed in, asks for them.
function fromServerPage(event) {
  return fromAppPage(event) && Boolean(settings.serverUrl) && event.senderFrame.url !== SETUP_URL;
}

ipcMain.handle("anchor:take-local-notes", (event) => {
  if (!fromServerPage(event)) throw new Error("Not allowed");
  try {
    return new Uint8Array(fs.readFileSync(localNotesFile()));
  } catch {
    return null;
  }
});

// In the account now: the built-in client starts empty, as on Android.
ipcMain.handle("anchor:local-notes-moved", async (event) => {
  if (!fromServerPage(event)) throw new Error("Not allowed");
  fs.rmSync(localNotesFile(), { force: true });
  await mainWindow.webContents.session.clearStorageData({ origin: LOCAL_ORIGIN });
  return true;
});

// --- Updates ---------------------------------------------------------------

let updater = null;

// The window's own top frame: the setup page or the server's web client.
function fromAppPage(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) return false;
  if (event.senderFrame !== event.sender.mainFrame) return false;
  const url = event.senderFrame.url;
  return url === SETUP_URL || (originOf(url) !== null && originOf(url) === serverOrigin());
}

function updateReady(update) {
  buildMenu();
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send("anchor:update", update);
}

ipcMain.handle("anchor:get-update", (event) => {
  if (!fromAppPage(event)) throw new Error("Not allowed");
  return updater?.current() ?? null;
});

ipcMain.handle("anchor:install-update", (event) => {
  if (!fromAppPage(event)) throw new Error("Not allowed");
  return updater?.install() ?? false;
});

// --- Menu ------------------------------------------------------------------

// The window has no address bar, so the menu gives the browser's back and
// forward, never back onto the setup page.
function goInHistory(step) {
  const history = mainWindow?.webContents.navigationHistory;
  if (!history?.canGoToOffset(step)) return;
  if (history.getEntryAtIndex(history.getActiveIndex() + step)?.url.startsWith(SETUP_URL)) return;
  history.goToOffset(step);
}

// A new note from anywhere on the computer. Ctrl+Alt is AltGr on many
// keyboards, so it can be turned off where it types a letter.
const QUICK_NOTE_KEYS = "CommandOrControl+Alt+Shift+N";

function newNoteFromAnywhere() {
  if (!mainWindow) {
    createWindow();
    start();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  const contents = mainWindow.webContents;
  if (contents.getURL().startsWith("file:")) return;
  contents.executeJavaScript('window.dispatchEvent(new Event("anchor:new-note"))').catch(() => {});
}

function applyQuickNote() {
  globalShortcut.unregister(QUICK_NOTE_KEYS);
  if (settings.quickNote === false) return;
  if (!globalShortcut.register(QUICK_NOTE_KEYS, newNoteFromAnywhere))
    console.error(`${QUICK_NOTE_KEYS} is taken by another app.`);
}

function setQuickNote(on) {
  settings.quickNote = on;
  saveSettings();
  applyQuickNote();
  buildMenu();
}

function changeServer() {
  if (!mainWindow) createWindow();
  mainWindow.show();
  showSetup({ canRetry: true });
}

// Release candidates: only when asked for, and the server runs the preview
// image (ghcr.io/<owner>/anchor-plus:preview).
async function wantsCandidates() {
  if (!settings.previewReleases || !settings.serverUrl) return false;
  const server = await checkServer(settings.serverUrl, {
    headers: headersFor(savedHeaders, settings.serverUrl),
  });
  return server.ok && Boolean(server.image?.endsWith(":preview"));
}

function setPreviewReleases(on) {
  settings.previewReleases = on;
  saveSettings();
  buildMenu();
  updater?.check();
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const changeServerItem = {
    label: settings.serverUrl ? "Change server…" : "Connect to a server…",
    click: changeServer,
  };
  const previewItems = updater
    ? [
        {
          label: "Receive Preview Releases",
          type: "checkbox",
          checked: Boolean(settings.previewReleases),
          click: (item) => setPreviewReleases(item.checked),
        },
      ]
    : [];
  const quickNoteItem = {
    label: "New Note from Anywhere",
    type: "checkbox",
    checked: settings.quickNote !== false,
    accelerator: QUICK_NOTE_KEYS,
    registerAccelerator: false,
    click: (item) => setQuickNote(item.checked),
  };
  // Says, in the menu, that the server lacks Anchor+'s features, and why.
  const regularServerItems =
    currentEdition() === "regular"
      ? [{ label: "Regular Anchor Server: Some Features Are Off…", click: explainRegularServer }]
      : [];
  const update = updater?.current();
  const updateItems = update
    ? [{ label: `Restart to Update (${update.version})`, click: () => updater.install() }, { type: "separator" }]
    : [];
  const template = [
    ...(isMac
      ? [
          {
            label: APP_NAME,
            submenu: [
              { role: "about" },
              { type: "separator" },
              ...updateItems,
              changeServerItem,
              ...regularServerItems,
              ...previewItems,
              quickNoteItem,
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : [
          {
            label: "&File",
            submenu: [
              ...updateItems,
              changeServerItem,
              ...regularServerItems,
              ...previewItems,
              quickNoteItem,
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]),
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { label: "Back", accelerator: isMac ? "Cmd+[" : "Alt+Left", click: () => goInHistory(-1) },
        { label: "Forward", accelerator: isMac ? "Cmd+]" : "Alt+Right", click: () => goInHistory(1) },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        {
          label: "Source Code",
          click: () => openExternal(sourceCodeUrl(app.getVersion(), anchorBuild)),
        },
        {
          label: "License (GNU AGPL v3, No Warranty)",
          click: () => openExternal(licenseUrl(app.getVersion(), anchorBuild)),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- App lifecycle ---------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    protocol.handle(LOCAL_SCHEME, serveLocal);
    savedHeaders = readHeaders();
    sendHeaders(session.defaultSession);
    // For live images: a screen or window shown in a note.
    allowScreenSharing(session.defaultSession, () => mainWindow);
    app.setAboutPanelOptions({
      applicationName: APP_NAME,
      applicationVersion: app.getVersion(),
      copyright: "© The Anchor and Anchor+ contributors. GNU AGPL v3, no warranty.",
      website: REPOSITORY,
    });
    buildMenu();
    createWindow();
    start();
    refreshEdition().catch(() => {});
    applyQuickNote();
    updater = startUpdater({ onReady: updateReady, openExternal, wantsCandidates });
    buildMenu();

    // Locking the computer ends the web client's unlock session: notes
    // unlocked since lock again, as on a phone.
    powerMonitor.on("lock-screen", () => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (window.webContents.getURL().startsWith("file:")) continue;
        window.webContents
          .executeJavaScript('window.dispatchEvent(new Event("anchor:screen-locked"))')
          .catch(() => {});
      }
    });

    app.on("activate", () => {
      if (!mainWindow) {
        createWindow();
        start();
      }
    });
  });

  app.on("will-quit", () => globalShortcut.unregisterAll());

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

// Never let a page attach webviews or load the app's own preload elsewhere.
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (event) => event.preventDefault());
});
