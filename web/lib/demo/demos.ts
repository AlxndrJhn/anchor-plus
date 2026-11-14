// The feature demos of the demo build: each opens at /<slug> (on GitHub
// Pages, /anchor-plus/demo/<slug>), loads its own notes and plays its steps.

import {
  caretToEnd,
  center,
  clickElement,
  dragBetween,
  pressKey,
  type Step,
  selectInEditor,
  type Target,
  typeCharacter,
} from "./runner";
import { pictureBlob, type Seed } from "./seed";

export interface Demo {
  slug: string;
  title: string;
  /** One line for the list at /demos. */
  summary: string;
  seed: Seed;
  /** The page it opens on. */
  start: string;
  steps: Step[];
  /** Shown when it has played: what to try now. */
  outro: string;
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
const searchBox: Target = { css: 'input[aria-label="Search notes"]' };

/** The sidebar's New note, or a phone's round button. */
const newNote: Target = { css: 'a[href*="/notes/new"]' };

/** Opens the sidebar on a phone, where the tags are; nothing wider. */
const openSidebar: Step = { click: "Open menu", ifShown: true };

/** A control inside the open popover or menu. */
const inPopup = (text: string): Step => ({
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
const fromMoreMenu = (item: string, say?: string): Step[] => [
  { click: "More", say },
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

/** Hands files to the open note's attachment picker, as choosing them would. */
const attach = (files: () => File[], say?: string): Step => ({
  say,
  run: async (play) => {
    const button = await play.find({ css: "button", text: "Picture or audio" });
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
    title: "Freeze a note",
    summary:
      "Nobody can change, trash or delete it until its owner unfreezes it.",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Stand-up notes", "Open a note you want to keep as it is."),
      ...fromMoreMenu("Freeze", "In the More menu, choose Freeze."),
      {
        say: "Frozen: the text can't be edited, and the note can't be trashed or deleted.",
      },
      { wait: 2500 },
      ...fromMoreMenu("Unfreeze", "Unfreeze it from the same menu."),
      { say: "Now it can be edited again." },
    ],
    outro:
      "Try it: freeze a note, then try to type in it or move it to the trash.",
  },
  {
    slug: "copy",
    title: "Make a copy",
    summary: "Copy a note, with its pictures and attachments.",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Groceries", "Open a note."),
      ...fromMoreMenu("Make a copy", "More › Make a copy."),
      { wait: 1200 },
      { click: "Back", say: "The copy sits next to the original." },
      { wait: 1500 },
    ],
    outro: "Try it: copy a note, then change the copy.",
  },
  {
    slug: "drag",
    title: "Drag notes into order",
    summary:
      "Arrange notes as in Google Keep: the others make room, and a moved note stays put.",
    seed: base,
    start: "/notes",
    steps: [
      { say: "Pick a note up and drag it where you want it." },
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
      { say: "The other notes made room, and the order is kept." },
    ],
    outro:
      "Try it: drag a note to another place. It stays there until you edit it.",
  },
  {
    slug: "bulk-colour",
    title: "Colour many notes at once",
    summary: "Select several notes and give them one colour.",
    seed: base,
    start: "/notes",
    steps: [
      { click: { css: "button", text: "Select" }, say: "Choose Select…" },
      { click: "Select Stand-up notes", say: "…then pick some notes." },
      { click: "Select App ideas" },
      { click: "Select Lisbon trip" },
      { click: "Colour", say: "Colour changes all of them at once." },
      { click: { css: '[role=radio][aria-label="Pink"]' } },
      { wait: 1500 },
    ],
    outro: "Try it: select notes, then use the bar at the bottom.",
  },
  {
    slug: "tick-from-list",
    title: "Tick items from the list",
    summary: "Tick checklist items straight from the notes list.",
    seed: base,
    start: "/notes",
    steps: [
      { say: "No need to open a checklist to tick it off." },
      { click: "Tick Oat milk" },
      { click: "Tick Basil" },
      { click: "Tick The Overstory" },
      { say: "The ticks are saved; the cards stay where they are." },
    ],
    outro: "Try it: tick and untick items on the cards.",
  },
  {
    slug: "checkboxes",
    title: "Checkbox tools",
    summary: "Show or hide checkboxes, untick all items, delete ticked items.",
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
      openNote("Packing list", "Open a checklist."),
      ...fromMoreMenu(
        "Untick all items",
        "More › Untick all items starts over.",
      ),
      { wait: 1000 },
      {
        click: "Hide checkboxes",
        reveal: ["More"],
        say: "Hide checkboxes turns it into plain lines…",
      },
      { wait: 1000 },
      {
        click: "Show checkboxes",
        reveal: ["More"],
        say: "…and Show checkboxes back into a list.",
      },
      {
        say: "With items ticked, More › Delete ticked items clears them away.",
      },
    ],
    outro:
      "Try it: tick some items, then use More › Delete ticked items or Untick all items.",
  },
  {
    slug: "filters",
    title: "Search filters",
    summary: "Filter by colour, tag, pictures, checklists and reminders.",
    seed: base,
    start: "/notes",
    steps: [
      { click: "Filter notes", say: "Filter narrows the list down." },
      inPopup("Checklists"),
      { say: "Only checklists now." },
      {
        click: {
          css: '[data-radix-popper-content-wrapper] [aria-label="Yellow"]',
        },
        say: "Add a colour…",
      },
      { wait: 800 },
      inPopup("Clear filters"),
      inPopup("Travel"),
      {
        say: "…or a tag. Filters are kept in the address, so Back returns to them.",
      },
    ],
    outro: "Try it: combine filters with a search.",
  },
  {
    slug: "search-archive",
    title: "Search finds archived notes",
    summary:
      "Search also lists archived notes; Archive and Trash can be searched.",
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
        reveal: ["Search"],
        say: "A search on Notes also finds archived ones…",
      },
      { wait: 1500 },
      { go: "/archive", say: "…and Archive and Trash have their own search." },
      {
        type: "cabin",
        into: { css: 'input[aria-label="Search archive"]' },
        reveal: ["Search"],
      },
      { wait: 1200 },
    ],
    outro: "Try it: archive a note, then search for it from Notes.",
  },
  {
    slug: "search-marks",
    title: "Searched words marked",
    summary: "The words you searched for are marked in the note you open.",
    seed: base,
    start: "/notes",
    steps: [
      {
        type: "Sam",
        into: searchBox,
        reveal: ["Search"],
        say: "Search for a word…",
      },
      { wait: 600 },
      openNote("Stand-up notes", "…and open a note it found."),
      { say: "The word is marked in the text. Typing clears the marks." },
      { wait: 1500 },
    ],
    outro: "Try it: search, then open a result.",
  },
  {
    slug: "search-kept",
    title: "Search kept on the way back",
    summary: "Open a note from a search; Back returns to the same search.",
    seed: base,
    start: "/notes",
    steps: [
      {
        type: "trip",
        into: searchBox,
        reveal: ["Search"],
        say: "Search for something…",
      },
      { wait: 600 },
      openNote("Lisbon trip", "…open a note it found…"),
      { wait: 1000 },
      { click: "Back", say: "…and go back: the search is still there." },
      { wait: 1800 },
    ],
    outro: "Try it: search, open a note, then press Back.",
  },
  {
    slug: "tag-archived",
    title: "Tags count archived notes",
    summary:
      "A tag's count includes its archived notes, and the tag lists them.",
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
        say: "Travel counts 2 notes: one of them is archived.",
      },
      { click: { css: "a", textStarts: "Travel" }, say: "The tag lists both…" },
      { wait: 1200 },
      { say: "…the archived one included, so nothing tagged goes missing." },
    ],
    outro: "Try it: archive a tagged note, then open its tag.",
  },
  {
    slug: "paste-picture",
    title: "Paste a picture",
    summary: "Paste a picture into a note to add it as an attachment.",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Lisbon trip", "Copy a picture, open a note…"),
      { wait: 800 },
      {
        say: "…and paste it: it is added to the note.",
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
      { wait: 1500 },
      { click: { label: "Back" }, say: "The card shows it, too." },
      { wait: 1500 },
    ],
    outro:
      "Try it: copy a picture or take a screenshot, then paste it in a note.",
  },
  {
    slug: "attach-file",
    title: "Attach any file",
    summary: "Attach files of any kind to a note, not only pictures and audio.",
    seed: base,
    start: "/notes",
    steps: [
      {
        click: newNote,
        say: "In a note, Picture or audio…",
      },
      { type: "Tickets", into: "Title" },
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
        "…takes any kind of file, not only pictures and recordings.",
      ),
      { wait: 2000 },
      { say: "They sit with the note and download with a click." },
    ],
    outro: "Try it: attach a file to a note, or drop one on it.",
  },
  {
    slug: "tags",
    title: "Tag colours and order",
    summary: "Change a tag's colour from its menu; drag tags into any order.",
    seed: base,
    start: "/notes",
    steps: [
      openSidebar,
      {
        click: { label: "Options for Work", hidden: true },
        say: "Each tag's menu has its colour.",
      },
      { click: { css: '[role=menuitemradio][aria-label="Deep orange"]' } },
      { wait: 600 },
      { key: "Escape" },
      {
        say: "Move a tag by dragging its handle, or with the arrow keys.",
        run: async (play) => {
          for (let i = 0; i < 3; i++) {
            const handle = await play.find({
              label: "Move Travel",
              hidden: true,
            });
            await play.moveTo(handle);
            handle.focus();
            pressKey("ArrowUp");
            await play.pause(700);
          }
        },
      },
      { say: "The new order syncs to your other devices." },
    ],
    outro: "Try it: hover a tag, then drag its handle or open its menu.",
  },
  {
    slug: "text-style",
    title: "Text colour, fonts and highlights",
    summary: "Colour text, change its font, and highlight in any colour.",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Stand-up notes", "Open a note and select some words."),
      { wait: 1200 },
      select("Release on Friday"),
      { click: "Text colour and font", say: "Text colour and font…" },
      { click: { css: "button.ts-dot", label: "Red" } },
      { wait: 400 },
      select("Release on Friday"),
      { click: "Text colour and font" },
      {
        click: { css: "button.ts-font", text: "Handwriting" },
        say: "…and a font.",
      },
      { wait: 600 },
      select("onboarding screens", "Highlights come in any colour."),
      { click: "Highlight colors" },
      { click: { css: "button.hl-dot", label: "Green" } },
      { wait: 1200 },
    ],
    outro: "Try it: select text, then use the toolbar or the bubble above it.",
  },
  {
    slug: "burn",
    title: "Notes burn away",
    summary: "A deleted note burns away like a destroyed card in Balatro.",
    seed: base,
    start: "/notes",
    steps: [
      { click: { css: "button", text: "Select" }, say: "Select a note…" },
      { click: "Select App ideas" },
      { click: "Delete", say: "…and delete it." },
      { wait: 2200 },
      { say: "It went to the trash; Undo brings it back." },
    ],
    outro: "Try it: delete a note. Settings › Editor turns the effect off.",
  },
  {
    slug: "pictures",
    title: "Pictures on cards",
    summary: "View a card's picture full size, or hide pictures on cards.",
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
        click: { label: "View picture" },
        say: "Click a card's picture to see it full size.",
      },
      {
        click: "Next picture",
        // A phone swipes; the arrow keys work everywhere.
        orElse: { key: "ArrowRight" },
        say: "Step through the note's pictures.",
      },
      { click: "Close" },
      {
        click: { css: "button", text: "View" },
        say: "View › Pictures on cards hides them.",
      },
      { click: { css: "#cards-pictures" } },
      { wait: 1200 },
      { click: { css: "#cards-pictures" }, say: "And shows them again." },
    ],
    outro: "Try it: open a picture, or paste one into a note.",
  },
  {
    slug: "pictures-in-text",
    title: "Pictures in the text",
    summary:
      "Put pictures in the text; resize them by a corner, right-click to crop, mirror or caption them.",
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
      openNote("Balcony garden", "Open a note with pictures in its text."),
      { wait: 800 },
      {
        hover: { css: ".ql-editor .note-image img" },
        say: "Hover a picture: drag the dot at its corner to resize it.",
      },
      {
        run: async (play) => {
          const grip = await play.find({ css: ".nit-grip" });
          const start = center(grip);
          await play.moveTo(grip);
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
          let x = start.x;
          for (let i = 1; i <= 24; i++) {
            x = start.x + i * 8;
            play.cursor(x, start.y, true);
            grip.dispatchEvent(
              new PointerEvent("pointermove", {
                ...pointer,
                buttons: 1,
                clientX: x,
                clientY: start.y,
              }),
            );
            await play.pause(40);
          }
          grip.dispatchEvent(
            new PointerEvent("pointerup", {
              ...pointer,
              clientX: x,
              clientY: start.y,
            }),
          );
          play.cursor(x, start.y, false);
        },
      },
      { wait: 600 },
      rightClick(
        { css: ".ql-editor .note-image img", nth: 1 },
        "Right-click one (or hold it) for more.",
      ),
      { wait: 800 },
      { click: { css: "[role=menuitem]", text: "Mirror horizontally" } },
      { say: "Mirrored, cropped or replaced, it keeps its size and caption." },
      rightClick({ css: ".ql-editor .note-image img", nth: 1 }),
      { click: { css: "[role=menuitem]", text: "Add caption…" } },
      {
        type: "Basil, from the other side",
        into: { css: "[role=dialog] input" },
        say: "Give it a caption…",
      },
      { click: { css: "[role=dialog] button", text: "Save" } },
      { wait: 1200 },
      {
        say: "…and the picture button left of the text styles puts new ones at the caret.",
      },
    ],
    outro:
      "Try it: right-click a picture to crop it, or put one in the text with the picture button.",
  },
  {
    slug: "image-text",
    title: "Grab text from a picture",
    summary: "Select the text in a picture, copy it or insert it in the note.",
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
      { click: { label: "View picture" }, say: "Open a picture…" },
      {
        click: "Grab image text",
        say: "…and grab its text. It is read in your browser.",
      },
      { waitFor: { css: ".itv-w" }, timeout: 45_000 },
      {
        click: { css: "button", text: "Select all" },
        say: "Select words by dragging, or all of them.",
      },
      {
        click: { css: "button.itv-insert" },
        say: "Insert in note adds the text to the note.",
      },
      { wait: 1500 },
    ],
    outro: "Try it: open the picture and draw a box around some words.",
  },
  {
    slug: "history",
    title: "Version history",
    summary:
      "Each version shows its added and removed lines; restore any of them.",
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
      openNote("Launch plan", "Open a note with some history."),
      ...fromMoreMenu("Version history", "More › Version history."),
      { wait: 800 },
      {
        click: { css: "button.hs-row", nth: 1 },
        say: "Each version shows what was added (+) and removed (−).",
      },
      { wait: 1200 },
      { click: "Back to the version list", ifShown: true },
      { click: { css: "button.hs-row", nth: 2 } },
      { wait: 1200 },
      {
        click: { css: "button", text: "Restore" },
        say: "Restore brings a version back; Undo is at hand.",
      },
      { wait: 1200 },
    ],
    outro: "Try it: edit the note, then look at its history again.",
  },
  {
    slug: "appearance",
    title: "Colour schemes and styles",
    summary:
      "Nord, Dracula, OLED and more; Skeuomorphism, Neo-Brutalism and Lo-fi.",
    seed: base,
    start: "/settings",
    steps: [
      {
        click: {
          css: '[aria-label="Colour scheme"] [role=radio]',
          textStarts: "Nord",
        },
        say: "Pick a colour scheme…",
      },
      {
        click: {
          css: '[aria-label="Colour scheme"] [role=radio]',
          textStarts: "Dracula",
        },
      },
      {
        click: {
          css: '[aria-label="Style"] [role=radio]',
          textStarts: "Neo-Brutalism",
        },
        say: "…and a style.",
      },
      {
        click: {
          css: '[aria-label="Style"] [role=radio]',
          textStarts: "Skeuomorphism",
        },
      },
      {
        click: { css: '[aria-label="Theme"] [role=radio]', textStarts: "Dark" },
        say: "OLED is pure black in dark mode.",
      },
      {
        click: {
          css: '[aria-label="Colour scheme"] [role=radio]',
          textStarts: "OLED",
        },
      },
      { go: "/notes" },
      { wait: 1500 },
      { say: "A custom theme can be pasted as JSON, too." },
    ],
    outro: "Try it: Settings › Appearance. A reload goes back to the default.",
  },
  {
    slug: "custom-theme",
    title: "Custom theme from JSON",
    summary: "Paste a theme as JSON; the same JSON works on Android.",
    seed: base,
    start: "/settings",
    steps: [
      {
        say: "Settings › Appearance › Custom theme takes a theme as JSON.",
        run: async (play) => {
          const box = await play.find({ label: "Custom theme JSON" });
          await play.moveTo(box);
          clickElement(box);
          caretToEnd(box);
          // Pasted in one go, as from the clipboard.
          typeCharacter(customTheme);
          await play.pause(1200);
        },
      },
      {
        click: { css: "button", text: "Apply" },
        say: "Apply, and its colours replace the scheme's.",
      },
      { wait: 1200 },
      { go: "/notes" },
      { wait: 1500 },
      {
        say: "Colours it leaves out are the scheme's. Reset removes it.",
      },
    ],
    outro:
      "Try it: Settings › Appearance › Copy current theme as JSON, then change a colour.",
  },
  {
    slug: "shortcuts",
    title: "Keyboard shortcuts",
    summary:
      "Google Keep's shortcuts: c for a new note, / to search, Esc, e, f, #.",
    seed: base,
    start: "/notes",
    steps: [
      { key: "c", say: "c starts a new note…" },
      { wait: 600 },
      { type: "Call the plumber" },
      { key: "Escape", say: "…Esc closes it." },
      { wait: 800 },
      { key: "/", say: "/ jumps to the search." },
      { type: "plumber" },
      { wait: 1200 },
      {
        say: "In an opened note: e archives, f pins, # moves it to the trash.",
      },
    ],
    outro: "Try it: press c, write something, then Esc.",
  },
  {
    slug: "date",
    title: "Insert today's date",
    summary:
      "Type /date, or press Ctrl+; for the date (Ctrl+Shift+; with the time).",
    seed: base,
    start: "/notes",
    steps: [
      { click: newNote, say: "In a note…" },
      { wait: 600 },
      { type: "Meeting on " },
      {
        key: ";",
        code: "Semicolon",
        ctrl: true,
        say: "…Ctrl+; inserts today's date…",
      },
      { wait: 600 },
      { key: "Enter" },
      { type: "/date", say: "…and so does /date." },
      { wait: 500 },
      { key: "Enter" },
      {
        say: "Settings › Editor offers 2026-10-28 instead, and your own shortcut.",
      },
    ],
    outro: "Try it: type /date in a note.",
  },
  {
    slug: "lock",
    title: "Lock a note",
    summary: "Lock a note with a tap, a PIN, a pattern or your fingerprint.",
    seed: withNotes({
      id: "n-diary",
      title: "Diary",
      lock: "tap",
      age: 3,
      lines: ["Today I finally fixed the bike."],
    }),
    start: "/notes",
    steps: [
      openNote("Stand-up notes", "Open a note…"),
      ...fromMoreMenu("Lock…", "…choose More › Lock…"),
      {
        click: { css: "[role=dialog] [role=radio]", textStarts: "Just a tap" },
      },
      { click: { css: "[role=dialog] button", text: "Lock" } },
      { wait: 600 },
      { click: "Back", say: "A locked note shows only its title…" },
      openNote("Diary"),
      {
        click: { css: "button", text: "Tap to unlock" },
        say: "…and opens with a tap (or your PIN, pattern or password).",
      },
      { wait: 1500 },
    ],
    outro: "Try it: Settings › Note locks sets a PIN or pattern.",
  },
  {
    slug: "quick-writing",
    title: "Writing straight away",
    summary:
      "A new note opens with the cursor in its text; Tab goes from the title to the text.",
    seed: base,
    start: "/notes",
    steps: [
      {
        click: newNote,
        say: "A new note opens ready to type.",
      },
      { wait: 500 },
      { type: "Buy a birthday card for Mia" },
      { type: "Errands", into: "Title", say: "In the title…" },
      { key: "Tab", say: "…Tab goes on to the text." },
      { type: "Today: " },
      { wait: 1000 },
    ],
    outro: "Try it: press n anywhere for a new note.",
  },
  {
    slug: "send",
    title: "Send a note as text",
    summary: "Send a note to other apps as text, checklists as ☐ and ☑.",
    seed: base,
    start: "/notes",
    steps: [
      openNote("Groceries", "Open a note."),
      ...fromMoreMenu("Send", "More › Send shares it as text, or copies it."),
      { wait: 1500 },
      { say: "Checklists come out as ☐ and ☑ lines." },
    ],
    outro: "Try it: send a note, then paste it somewhere.",
  },
];

export function demoBySlug(slug: string): Demo | undefined {
  return demos.find((demo) => demo.slug === slug);
}
