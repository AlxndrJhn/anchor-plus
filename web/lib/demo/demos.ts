// The feature demos of the demo build: each opens at /<slug> (on GitHub
// Pages, /anchor-plus/demo/<slug>), loads its own notes and plays its steps.

import {
  caretToEnd,
  center,
  clickElement,
  dragBetween,
  type Play,
  pressKey,
  type Step,
  selectInEditor,
  type Target,
  type Text,
  typeCharacter,
  ui,
} from "./runner";
import { pictureBlob, type Seed } from "./seed";

/**
 * A feature demo. Its words are in messages/<locale>/demos.json, under
 * items.<slug>: the title, a summary for the list at /demos, the outro shown
 * when it has played (what to try now), and each step's caption, `say`.
 */
export interface Demo {
  slug: string;
  seed: Seed;
  /** The page it opens on. */
  start: string;
  steps: Step[];
}

const T = {
  work: { id: "tag-work", name: "Work", color: "#64B5F6" },
  home: { id: "tag-home", name: "Home", color: "#81C784" },
  ideas: { id: "tag-ideas", name: "Ideas", color: "#FFB74D" },
  travel: { id: "tag-travel", name: "Travel", color: "#BA68C8" },
};

const allTags = Object.values(T);

/** Notes most demos start with. */
const everyday: Seed["notes"] = [
  {
    id: "n-groceries",
    title: "Groceries",
    background: "color_yellow",
    tags: ["Home"],
    lines: [
      { item: "Oat milk" },
      { item: "Tomatoes", done: true },
      { item: "Basil" },
      { item: "Sourdough bread" },
    ],
  },
  {
    id: "n-standup",
    title: "Stand-up notes",
    tags: ["Work"],
    lines: [
      "Release on Friday, after the QA pass.",
      "Ask Sam about the new onboarding screens.",
    ],
  },
  {
    id: "n-trip",
    title: "Lisbon trip",
    background: "color_blue",
    tags: ["Travel"],
    lines: ["Tram 28 early in the morning", "Pastéis de Belém", "LX Factory"],
  },
  {
    id: "n-ideas",
    title: "App ideas",
    tags: ["Ideas"],
    lines: ["A plant watering reminder", "Recipe cards from photos"],
  },
  {
    id: "n-books",
    title: "Books to read",
    background: "color_green",
    lines: [
      { item: "The Overstory" },
      { item: "Piranesi", done: true },
      { item: "Project Hail Mary" },
    ],
  },
];

export const welcome: Seed = {
  tags: allTags,
  notes: [
    {
      id: "n-welcome",
      title: "Welcome to the Anchor+ demo",
      pinned: true,
      background: "color_teal",
      lines: [
        "Everything here lives only in this tab: a reload starts over.",
        "Feature demos, in the sidebar, plays a short demo of each feature.",
      ],
    },
    ...everyday,
  ],
};

const base: Seed = { tags: allTags, notes: everyday };

const withNotes = (...notes: Seed["notes"]): Seed => ({
  tags: allTags,
  notes: [...notes, ...everyday],
});

/** The notes list's search; behind a Search button on a phone. */
const searchBox: Target = {
  css: "input",
  label: ui("notes.notesPage.searchNotes"),
};

/** In the language on screen: the controls the demos press. */
const more = ui("common.more");
const back = ui("common.back");
const search = ui("common.search");
const selectNote = (label: string) =>
  ui("notes.noteCard.selectNote", { label });
const tick = (text: string) => ui("notes.noteBody.tickItem", { text });
const radioIn = (group: () => string) => () =>
  `[aria-label="${group()}"] [role=radio]`;
const schemeRadio = radioIn(ui("settings.appearance.colourScheme"));
const themeRadio = radioIn(ui("settings.appearance.theme"));

/** The sidebar's New note, or a phone's round button. */
const newNote: Target = { css: 'a[href*="/notes/new"]' };

/** Opens the sidebar on a phone, where the tags are; nothing wider. */
const openSidebar: Step = {
  click: ui("layout.appPage.openMenu"),
  ifShown: true,
};

/** A control inside the open popover or menu. */
const inPopup = (text: Text): Step => ({
  click: { css: "[data-radix-popper-content-wrapper] button", text },
});

/** Selects words in the open note, then shows them selected. */
const select = (text: string, say?: string): Step => ({
  say,
  run: async (play) => {
    const word = selectInEditor(text);
    if (word) await play.moveTo(word);
    selectInEditor(text);
    await play.pause(400);
  },
});

/** Opens a note's “More” menu in the editor and picks an item. */
const fromMoreMenu = (item: Text, say?: string): Step[] => [
  { click: more, say },
  { click: { css: "[role=menuitem]", text: item } },
];

/** Right-clicks a control, as a mouse's other button does. */
const rightClick = (target: Target, say?: string): Step => ({
  say,
  run: async (play) => {
    const element = await play.find(target);
    await play.moveTo(element);
    const { x, y } = center(element);
    element.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: x,
        clientY: y,
        view: window,
      }),
    );
  },
});

/** Opens a note from the notes list by its title. */
const openNote = (title: string, say?: string): Step => ({
  click: { css: `a.nc-link[aria-label="${title}"]` },
  say,
});

/**
 * Drags the corner dot of the hovered picture in the text sideways, to
 * `share` of its width; the pointer follows the dot as the picture resizes.
 */
const dragGrip = async (play: Play, share: number) => {
  const grip = await play.find({ css: ".nit-grip" });
  const picture = document.querySelector(".ql-editor .note-image img");
  const width = picture?.getBoundingClientRect().width ?? 200;
  const dx = width * (share - 1);
  await play.moveTo(grip);
  const start = center(grip);
  const pointer = {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
    view: window,
  };
  play.cursor(start.x, start.y, true);
  grip.dispatchEvent(
    new PointerEvent("pointerdown", {
      ...pointer,
      button: 0,
      buttons: 1,
      clientX: start.x,
      clientY: start.y,
    }),
  );
  const moves = 24;
  let x = start.x;
  for (let i = 1; i <= moves; i++) {
    x = start.x + (dx * i) / moves;
    grip.dispatchEvent(
      new PointerEvent("pointermove", {
        ...pointer,
        buttons: 1,
        clientX: x,
        clientY: start.y,
      }),
    );
    await play.pause(40);
    // A narrower picture is shorter too: its corner moves up.
    const at = grip.isConnected ? center(grip) : { x, y: start.y };
    play.cursor(at.x, at.y, true);
  }
  grip.dispatchEvent(
    new PointerEvent("pointerup", { ...pointer, clientX: x, clientY: start.y }),
  );
  // The dot hides on release; the pointer stays at the picture's corner.
  const box = picture?.getBoundingClientRect();
  if (box) play.cursor(box.right, box.bottom, false);
  else play.cursor(x, start.y, false);
};

/** Hands files to the open note's attachment picker, as choosing them would. */
const attach = (files: () => File[], say?: string): Step => ({
  say,
  run: async (play) => {
    const button = await play.find({
      css: "button",
      text: ui("noteEditor.content.pictureOrAudio"),
    });
    await play.moveTo(button);
    const input = document.querySelector<HTMLInputElement>(
      ".note-in input[type=file]",
    );
    if (!input) throw new Error("Not found: the attachment picker");
    const chosen = new DataTransfer();
    for (const file of files()) chosen.items.add(file);
    input.files = chosen.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  },
});

const customTheme = JSON.stringify(
  {
    name: "Ink",
    light: {
      background: "#f4f1ea",
      card: "#fffdf8",
      sidebar: "#ebe6db",
      accent: "#2f6fdd",
      border: "#d6cfc1",
    },
    dark: { background: "#000", card: "#111111", accent: "#7aa2f7" },
  },
  null,
  2,
);

export const demos: Demo[] = [
  {
    slug: "freeze",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Stand-up notes", "s1"),
      ...fromMoreMenu(ui("noteEditor.header.freeze"), "s2"),
      { say: "s3" },
      { wait: 2500 },
      ...fromMoreMenu(ui("noteEditor.header.unfreeze"), "s4"),
      { say: "s5" },
    ],
  },
  {
    slug: "copy",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Groceries", "s1"),
      ...fromMoreMenu(ui("noteEditor.header.makeCopy"), "s2"),
      { wait: 1200 },
      { click: back, say: "s3" },
      { wait: 1500 },
    ],
  },
  {
    slug: "drag",
    seed: base,
    start: "/notes",
    steps: [
      { say: "s1" },
      {
        run: async (play) => {
          const from = await play.find({
            css: 'a.nc-link[aria-label="Books to read"]',
          });
          const to = await play.find({
            css: 'a.nc-link[aria-label="Groceries"]',
          });
          await dragBetween(from, to, play);
        },
      },
      { say: "s2" },
    ],
  },
  {
    slug: "bulk-colour",
    seed: base,
    start: "/notes",
    steps: [
      {
        click: { css: "button", text: ui("notes.noteListActions.select") },
        say: "s1",
      },
      { click: selectNote("Stand-up notes"), say: "s2" },
      { click: selectNote("App ideas") },
      { click: selectNote("Lisbon trip") },
      { click: ui("notes.notesPage.colour"), say: "s3" },
      {
        click: {
          css: "[role=radio]",
          label: ui("notes.backgrounds.color_pink"),
        },
      },
      { wait: 1500 },
    ],
  },
  {
    slug: "tick-from-list",
    seed: base,
    start: "/notes",
    steps: [
      { say: "s1" },
      { click: tick("Oat milk") },
      { click: tick("Basil") },
      { click: tick("The Overstory") },
      { say: "s2" },
    ],
  },
  {
    slug: "checkboxes",
    seed: withNotes({
      id: "n-packing",
      title: "Packing list",
      age: 1,
      lines: [
        { item: "Passport", done: true },
        { item: "Charger", done: true },
        { item: "Sunscreen" },
        { item: "Swimsuit", done: true },
        { item: "Book" },
      ],
    }),
    start: "/notes",
    steps: [
      openNote("Packing list", "s1"),
      ...fromMoreMenu(ui("noteEditor.header.uncheckAll"), "s2"),
      { wait: 1000 },
      {
        click: ui("noteEditor.header.hideCheckboxes"),
        reveal: [more],
        say: "s3",
      },
      { wait: 1000 },
      {
        click: ui("noteEditor.header.showCheckboxes"),
        reveal: [more],
        say: "s4",
      },
      { say: "s5" },
    ],
  },
  {
    slug: "filters",
    seed: base,
    start: "/notes",
    steps: [
      { click: ui("notes.filterMenu.filterNotes"), say: "s1" },
      inPopup(ui("notes.filterMenu.checklists")),
      { say: "s2" },
      {
        click: {
          css: "[data-radix-popper-content-wrapper] [aria-label]",
          label: ui("notes.backgrounds.color_yellow"),
        },
        say: "s3",
      },
      { wait: 800 },
      inPopup(ui("notes.filterMenu.clearFilters")),
      inPopup("Travel"),
      { say: "s4" },
    ],
  },
  {
    slug: "search-archive",
    seed: withNotes({
      id: "n-wifi",
      title: "Cabin wifi",
      archived: true,
      lines: ["Network: cabin-guest", "Password: on the fridge"],
    }),
    start: "/notes",
    steps: [
      {
        type: "wifi",
        into: searchBox,
        reveal: [search],
        say: "s1",
      },
      { wait: 1500 },
      { go: "/archive", say: "s2" },
      {
        type: "cabin",
        into: { css: "input", label: ui("notes.archivePage.search") },
        reveal: [search],
      },
      { wait: 1200 },
    ],
  },
  {
    slug: "search-marks",
    seed: base,
    start: "/notes",
    steps: [
      {
        type: "Sam",
        into: searchBox,
        reveal: [search],
        say: "s1",
      },
      { wait: 600 },
      openNote("Stand-up notes", "s2"),
      { say: "s3" },
      { wait: 1500 },
    ],
  },
  {
    slug: "search-kept",
    seed: base,
    start: "/notes",
    steps: [
      {
        type: "trip",
        into: searchBox,
        reveal: [search],
        say: "s1",
      },
      { wait: 600 },
      openNote("Lisbon trip", "s2"),
      { wait: 1000 },
      { click: back, say: "s3" },
      { wait: 1800 },
    ],
  },
  {
    slug: "tag-archived",
    seed: withNotes({
      id: "n-rome",
      title: "Rome, last spring",
      archived: true,
      tags: ["Travel"],
      age: 60 * 24 * 90,
      lines: ["Trastevere at dusk", "Supplì from the corner shop"],
    }),
    start: "/notes",
    steps: [
      openSidebar,
      {
        hover: { css: "a", textStarts: "Travel" },
        say: "s1",
      },
      { click: { css: "a", textStarts: "Travel" }, say: "s2" },
      { wait: 1200 },
      { say: "s3" },
    ],
  },
  {
    slug: "paste-picture",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Lisbon trip", "s1"),
      { wait: 800 },
      {
        say: "s2",
        run: async (play) => {
          const editor = await play.find({ css: ".ql-editor" });
          await play.moveTo(editor);
          caretToEnd(editor);
          const clipboard = new DataTransfer();
          clipboard.items.add(
            new File([pictureBlob(190, "Tram 28")], "image.png", {
              type: "image/png",
            }),
          );
          editor.dispatchEvent(
            new ClipboardEvent("paste", {
              bubbles: true,
              cancelable: true,
              clipboardData: clipboard,
            }),
          );
        },
      },
      { waitFor: { css: ".ql-editor .note-image img" } },
      { wait: 1000 },
      {
        hover: { css: ".ql-editor .note-image img" },
        say: "s3",
      },
      { run: (play) => dragGrip(play, 0.45) },
      { say: "s4" },
      { wait: 1500 },
      { click: { label: back }, say: "s5" },
      { wait: 1500 },
    ],
  },
  {
    slug: "attach-file",
    seed: base,
    start: "/notes",
    steps: [
      {
        click: newNote,
        say: "s1",
      },
      { type: "Tickets", into: ui("noteEditor.content.title") },
      attach(
        () => [
          new File(
            ["Lisbon, 12–16 May\nFlight TP 1351, seat 14A\n"],
            "boarding-pass.txt",
            { type: "text/plain" },
          ),
          new File(["date,place\n2026-05-13,Belém\n"], "plan.csv", {
            type: "text/csv",
          }),
        ],
        "s2",
      ),
      { wait: 2000 },
      { say: "s3" },
    ],
  },
  {
    slug: "tags",
    seed: base,
    start: "/notes",
    steps: [
      openSidebar,
      {
        click: {
          label: ui("layout.sidebar.tagOptions", { name: "Work" }),
          hidden: true,
        },
        say: "s1",
      },
      {
        click: {
          css: "[role=menuitemradio]",
          label: ui("settings.tags.colors.deepOrange"),
        },
      },
      { wait: 600 },
      { key: "Escape" },
      {
        say: "s2",
        run: async (play) => {
          for (let i = 0; i < 3; i++) {
            const handle = await play.find({
              label: ui("layout.sidebar.moveTag", { name: "Travel" }),
              hidden: true,
            });
            await play.moveTo(handle);
            handle.focus();
            pressKey("ArrowUp");
            await play.pause(700);
          }
        },
      },
      { say: "s3" },
    ],
  },
  {
    slug: "text-style",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Stand-up notes", "s1"),
      { wait: 1200 },
      select("Release on Friday"),
      { click: ui("editor.textStyle.button"), say: "s2" },
      {
        click: {
          css: "button.ts-dot",
          label: ui("noteHooks.textStyle.colors.red"),
        },
      },
      { wait: 400 },
      select("Release on Friday"),
      { click: ui("editor.textStyle.button") },
      {
        click: {
          css: "button.ts-font",
          text: ui("noteHooks.textStyle.fonts.handwriting"),
        },
        say: "s3",
      },
      { wait: 600 },
      select("onboarding screens", "s4"),
      { click: ui("editor.toolbar.highlightColors") },
      {
        click: {
          css: "button.hl-dot",
          label: ui("editorMedia.highlight.color.green"),
        },
      },
      { wait: 1200 },
    ],
  },
  {
    slug: "burn",
    seed: base,
    start: "/notes",
    steps: [
      {
        click: { css: "button", text: ui("notes.noteListActions.select") },
        say: "s1",
      },
      { click: selectNote("App ideas") },
      { click: ui("common.delete"), say: "s2" },
      { wait: 2200 },
      { say: "s3" },
    ],
  },
  {
    slug: "pictures",
    seed: withNotes({
      id: "n-hike",
      title: "Hike photos",
      age: 1,
      lines: ["Sunday's loop above the lake."],
      pictures: [
        { id: "p-lake", name: "lake.png", hue: 200, label: "Lake view" },
        { id: "p-peak", name: "peak.png", hue: 25, label: "Summit at noon" },
      ],
    }),
    start: "/notes",
    steps: [
      {
        click: { label: ui("notes.noteCard.viewPicture") },
        say: "s1",
      },
      {
        click: ui("noteEditor.attachments.viewer.next"),
        // A phone swipes; the arrow keys work everywhere.
        orElse: { key: "ArrowRight" },
        say: "s2",
      },
      { click: ui("common.close") },
      {
        click: { css: "button", text: ui("notes.viewOptions.view") },
        say: "s3",
      },
      { click: { css: "#cards-pictures" } },
      { wait: 1200 },
      { click: { css: "#cards-pictures" }, say: "s4" },
    ],
  },
  {
    slug: "pictures-in-text",
    seed: withNotes({
      id: "n-garden",
      title: "Balcony garden",
      age: 1,
      lines: [
        "The tomatoes finally got some sun this week.",
        { picture: "p-tomatoes", width: 0.4, caption: "First ripe ones" },
        "The basil:",
        { picture: "p-basil", width: 0.7 },
        "Water every other evening.",
      ],
      pictures: [
        { id: "p-tomatoes", name: "tomatoes.png", hue: 5, label: "Tomatoes" },
        { id: "p-basil", name: "basil.png", hue: 110, label: "Basil" },
      ],
    }),
    start: "/notes",
    steps: [
      openNote("Balcony garden", "s1"),
      { wait: 800 },
      {
        hover: { css: ".ql-editor .note-image img" },
        say: "s2",
      },
      // The tomatoes, at 40%, grow to 70%.
      { run: (play) => dragGrip(play, 0.7 / 0.4) },
      { wait: 600 },
      rightClick({ css: ".ql-editor .note-image img", nth: 1 }, "s3"),
      { wait: 800 },
      {
        click: {
          css: "[role=menuitem]",
          text: ui("editorMedia.inlineImage.mirrorHorizontally"),
        },
      },
      { say: "s4" },
      rightClick({ css: ".ql-editor .note-image img", nth: 1 }),
      {
        click: {
          css: "[role=menuitem]",
          text: ui("editorMedia.inlineImage.addCaptionMenu"),
        },
      },
      {
        type: "Basil, from the other side",
        into: { css: "[role=dialog] input" },
        say: "s5",
      },
      { click: { css: "[role=dialog] button", text: ui("common.save") } },
      { wait: 1200 },
      { say: "s6" },
    ],
  },
  {
    slug: "image-text",
    seed: withNotes({
      id: "n-receipt",
      title: "Receipt",
      age: 1,
      pictures: [
        {
          id: "p-receipt",
          name: "receipt.png",
          hue: 50,
          label: "Coffee 3.50 Bagel 2.80",
        },
      ],
    }),
    start: "/notes",
    steps: [
      { click: { label: ui("notes.noteCard.viewPicture") }, say: "s1" },
      {
        click: ui("noteEditor.attachments.viewer.grabImageText"),
        say: "s2",
      },
      { waitFor: { css: ".itv-w" }, timeout: 45_000 },
      {
        click: {
          css: "button",
          text: ui("noteEditor.attachments.imageText.selectAll"),
        },
        say: "s3",
      },
      {
        click: { css: "button.itv-insert" },
        say: "s4",
      },
      { wait: 1500 },
    ],
  },
  {
    slug: "history",
    seed: withNotes({
      id: "n-plan",
      title: "Launch plan",
      age: 2,
      lines: [
        "Launch on the 14th",
        "Blog post ready",
        "Email the beta testers",
        "Update the store screenshots",
      ],
      history: [
        { lines: ["Launch on the 7th", "Blog post draft"], age: 60 * 26 },
        {
          lines: [
            "Launch on the 14th",
            "Blog post draft",
            "Email the beta testers",
          ],
          age: 60 * 3,
        },
      ],
    }),
    start: "/notes",
    steps: [
      openNote("Launch plan", "s1"),
      ...fromMoreMenu(ui("noteEditor.header.versionHistory"), "s2"),
      { wait: 800 },
      {
        click: { css: "button.hs-row", nth: 1 },
        say: "s3",
      },
      { wait: 1200 },
      { click: ui("notes.historyView.backToList"), ifShown: true },
      { click: { css: "button.hs-row", nth: 2 } },
      { wait: 1200 },
      {
        click: { css: "button", text: ui("notes.historyView.restore") },
        say: "s4",
      },
      { wait: 1200 },
    ],
  },
  {
    slug: "appearance",
    seed: base,
    start: "/settings",
    steps: [
      {
        click: {
          css: schemeRadio,
          textStarts: "Nord",
        },
        say: "s1",
      },
      {
        click: {
          css: schemeRadio,
          textStarts: "Dracula",
        },
      },
      {
        click: { css: themeRadio, textStarts: ui("settings.appearance.dark") },
        say: "s2",
      },
      {
        click: {
          css: schemeRadio,
          textStarts: "OLED",
        },
      },
      { go: "/notes" },
      { wait: 1500 },
      { say: "s3" },
    ],
  },
  {
    slug: "custom-theme",
    seed: base,
    start: "/settings",
    steps: [
      {
        say: "s1",
        run: async (play) => {
          const box = await play.find({
            label: ui("settings.customTheme.jsonLabel"),
          });
          await play.moveTo(box);
          clickElement(box);
          caretToEnd(box);
          // Pasted in one go, as from the clipboard.
          typeCharacter(customTheme);
          await play.pause(1200);
        },
      },
      {
        click: { css: "button", text: ui("settings.customTheme.apply") },
        say: "s2",
      },
      { wait: 1200 },
      { go: "/notes" },
      { wait: 1500 },
      { say: "s3" },
    ],
  },
  {
    slug: "shortcuts",
    seed: base,
    start: "/notes",
    steps: [
      { key: "c", say: "s1" },
      { wait: 600 },
      { type: "Call the plumber" },
      { key: "Escape", say: "s2" },
      { wait: 800 },
      { key: "/", say: "s3" },
      { type: "plumber" },
      { wait: 1200 },
      { say: "s4" },
    ],
  },
  {
    slug: "date",
    seed: base,
    start: "/notes",
    steps: [
      { click: newNote, say: "s1" },
      { wait: 600 },
      { type: "Meeting on " },
      {
        key: ";",
        code: "Semicolon",
        ctrl: true,
        say: "s2",
      },
      { wait: 600 },
      { key: "Enter" },
      { type: "/date", say: "s3" },
      { wait: 500 },
      { key: "Enter" },
      { say: "s4" },
    ],
  },
  {
    slug: "lock",
    seed: withNotes({
      id: "n-diary",
      title: "Diary",
      lock: "tap",
      age: 3,
      lines: ["Today I finally fixed the bike."],
    }),
    start: "/notes",
    steps: [
      openNote("Stand-up notes", "s1"),
      ...fromMoreMenu(ui("noteEditor.header.lock"), "s2"),
      {
        click: {
          css: "[role=dialog] [role=radio]",
          textStarts: ui("noteHooks.noteLock.kinds.tap.label"),
        },
      },
      {
        click: {
          css: "[role=dialog] button",
          text: ui("noteEditor.lock.dialog.title"),
        },
      },
      { wait: 600 },
      { click: back, say: "s3" },
      openNote("Diary"),
      {
        click: { css: "button", text: ui("noteEditor.lock.unlock.tap") },
        say: "s4",
      },
      { wait: 1500 },
    ],
  },
  {
    slug: "quick-writing",
    seed: base,
    start: "/notes",
    steps: [
      {
        click: newNote,
        say: "s1",
      },
      { wait: 500 },
      { type: "Buy a birthday card for Mia" },
      { type: "Errands", into: ui("noteEditor.content.title"), say: "s2" },
      { key: "Tab", say: "s3" },
      { type: "Today: " },
      { wait: 1000 },
    ],
  },
  {
    slug: "send",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Groceries", "s1"),
      ...fromMoreMenu(ui("noteEditor.header.send"), "s2"),
      { wait: 1500 },
      { say: "s3" },
    ],
  },
];

export function demoBySlug(slug: string): Demo | undefined {
  return demos.find((demo) => demo.slug === slug);
}
