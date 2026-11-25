/**
 * Every command a key can run, and the keys it has unless changed: the
 * defaults of the Keyboard shortcuts page. Titles are in
 * messages/<locale>/keybindings.json under `commands`.
 */

export type Category = "app" | "list" | "note" | "editor";

interface DefaultKey {
  key: string;
  when?: string;
}

interface CommandDefinition {
  id: string;
  category: Category;
  keys: DefaultKey[];
  /**
   * Its keys with Ctrl, Alt or ⌘ act before the focused field sees them
   * (Quill takes every Enter, for one).
   */
  first?: boolean;
}

const NOTES_PAGE = "view == 'notes'";

export const COMMANDS = [
  // Anywhere.
  { id: "app.newNote", category: "app", keys: [{ key: "n" }] },
  {
    id: "app.search",
    category: "app",
    keys: [{ key: "/", when: "searchField" }, { key: "mod+k" }],
  },
  { id: "app.goToNotes", category: "app", keys: [{ key: "g n" }] },
  { id: "app.goToArchive", category: "app", keys: [{ key: "g a" }] },
  { id: "app.goToTrash", category: "app", keys: [{ key: "g t" }] },
  { id: "app.goToSettings", category: "app", keys: [{ key: "g s" }] },
  {
    id: "app.goToTag",
    category: "app",
    keys: [{ key: "#", when: "!noteOpen" }],
  },
  { id: "app.toggleSidebar", category: "app", keys: [{ key: "mod+\\" }] },
  { id: "app.showShortcuts", category: "app", keys: [{ key: "?" }] },
  {
    id: "app.openKeybindings",
    category: "app",
    keys: [{ key: "mod+k mod+s" }],
  },
  {
    id: "app.recordBug",
    category: "app",
    first: true,
    keys: [{ key: "ctrl+shift+alt+b" }],
  },

  // A list of notes.
  {
    id: "list.newNote",
    category: "list",
    keys: [{ key: "c", when: NOTES_PAGE }],
  },
  {
    id: "list.newList",
    category: "list",
    keys: [{ key: "l", when: `${NOTES_PAGE} && !cardFocus` }],
  },
  {
    id: "list.focusFirst",
    category: "list",
    keys: [
      { key: "g g", when: "notesList" },
      { key: "j", when: "notesList && !cardFocus" },
      { key: "k", when: "notesList && !cardFocus" },
      { key: "home", when: "cardFocus" },
    ],
  },
  {
    id: "list.focusLast",
    category: "list",
    keys: [
      { key: "shift+g", when: "notesList" },
      { key: "end", when: "cardFocus" },
    ],
  },
  {
    id: "list.focusUp",
    category: "list",
    keys: [
      { key: "up", when: "cardFocus" },
      { key: "k", when: "cardFocus" },
    ],
  },
  {
    id: "list.focusDown",
    category: "list",
    keys: [
      { key: "down", when: "cardFocus" },
      { key: "j", when: "cardFocus" },
    ],
  },
  {
    id: "list.focusLeft",
    category: "list",
    keys: [
      { key: "left", when: "cardFocus" },
      { key: "h", when: "cardFocus" },
    ],
  },
  {
    id: "list.focusRight",
    category: "list",
    keys: [
      { key: "right", when: "cardFocus" },
      { key: "l", when: "cardFocus" },
    ],
  },
  {
    id: "list.open",
    category: "list",
    keys: [
      { key: "enter", when: "cardFocus" },
      { key: "o", when: "cardFocus" },
    ],
  },
  {
    id: "list.toggleSelect",
    category: "list",
    keys: [
      { key: "x", when: "cardFocus" },
      { key: "space", when: "cardFocus" },
    ],
  },
  {
    id: "list.selectRange",
    category: "list",
    keys: [
      { key: "shift+x", when: "cardFocus" },
      { key: "shift+space", when: "cardFocus" },
    ],
  },
  {
    id: "list.moveEarlier",
    category: "list",
    keys: [
      { key: "alt+up", when: "cardFocus" },
      { key: "alt+left", when: "cardFocus" },
    ],
  },
  {
    id: "list.moveLater",
    category: "list",
    keys: [
      { key: "alt+down", when: "cardFocus" },
      { key: "alt+right", when: "cardFocus" },
    ],
  },
  {
    id: "list.togglePin",
    category: "list",
    keys: [{ key: "f", when: "cardFocus || selecting" }],
  },
  {
    id: "list.toggleArchive",
    category: "list",
    keys: [{ key: "e", when: "cardFocus || selecting" }],
  },
  {
    id: "list.trash",
    category: "list",
    keys: [{ key: "delete", when: "cardFocus || selecting" }],
  },
  {
    id: "list.clearSearch",
    category: "list",
    keys: [{ key: "escape", when: "searching && !selecting" }],
  },
  {
    id: "list.leaveTag",
    category: "list",
    keys: [
      {
        key: "escape",
        when: "inTag && !searching && !selecting && !notePane",
      },
    ],
  },

  // An open note.
  {
    id: "note.close",
    category: "note",
    first: true,
    keys: [
      { key: "escape", when: "noteOpen" },
      { key: "mod+enter", when: "noteOpen && !checklistItem" },
    ],
  },
  {
    id: "note.editText",
    category: "note",
    keys: [{ key: "i", when: "noteOpen" }],
  },
  {
    id: "note.togglePin",
    category: "note",
    keys: [{ key: "f", when: "noteOpen && !cardFocus" }],
  },
  {
    id: "note.toggleArchive",
    category: "note",
    keys: [{ key: "e", when: "noteOpen && !cardFocus" }],
  },
  {
    id: "note.trash",
    category: "note",
    keys: [
      { key: "delete", when: "noteOpen && !cardFocus" },
      { key: "#", when: "noteOpen && !cardFocus" },
    ],
  },

  // Typing in a note.
  {
    id: "editor.insertDate",
    category: "editor",
    keys: [{ key: "ctrl+;", when: "editorFocus" }],
  },
  {
    id: "editor.insertDateTime",
    category: "editor",
    keys: [{ key: "ctrl+shift+;", when: "editorFocus" }],
  },
  {
    id: "editor.insertLink",
    category: "editor",
    keys: [{ key: "mod+k", when: "editorFocus" }],
  },
] as const satisfies readonly CommandDefinition[];

export type CommandId = (typeof COMMANDS)[number]["id"];

export const COMMAND_IDS = new Set<string>(COMMANDS.map((c) => c.id));

export const CATEGORIES: Category[] = ["app", "list", "note", "editor"];

export const commandById = (id: string) =>
  (COMMANDS as readonly CommandDefinition[]).find((c) => c.id === id);

/**
 * The context keys a when clause can read, for the editor's help and to
 * flag a misspelt one. Values are in messages under `context`.
 */
export const CONTEXT_KEYS = [
  "view",
  "inputFocus",
  "editorFocus",
  "cardFocus",
  "notesList",
  "selecting",
  "searching",
  "inTag",
  "notePane",
  "noteOpen",
  "checklistItem",
  "searchField",
  "isMac",
] as const;
