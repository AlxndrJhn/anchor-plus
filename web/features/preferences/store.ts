import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DateFormat, Shortcut } from "@/features/notes/date-stamp";
import type {
  BarWidth,
  QuickActionSetup,
} from "@/features/notes/quick-actions";
import type { CustomTheme } from "@/lib/design/custom-theme";
import type { LanguagePreference } from "@/lib/i18n/locales";
import type { DateDisplay, TimeDisplay, WeekStart } from "./date-time";

export type ViewMode = "masonry" | "grid" | "list" | "columns";
export type SortBy = "updatedAt" | "createdAt" | "title" | "size";
export type SortOrder = "asc" | "desc";

/** Clean puts the tags under the text and folds the formatting bar away. */
export type NoteLayout = "default" | "clean";

interface UIPreferences {
  sidebarCollapsed: boolean;
  /** A colour scheme id from lib/design/schemes, or "anchor". */
  colorScheme?: string;
  /** A theme pasted as JSON in Settings: colours over the scheme, and a style. */
  customTheme?: CustomTheme;
  /** The app’s language; unset follows the browser’s. */
  language?: LanguagePreference;
  /** How dates read across the app; unset follows the browser's language. */
  dateDisplay?: DateDisplay;
  /** 12 or 24 hours; unset follows the browser's language. */
  timeDisplay?: TimeDisplay;
  /** The day calendars start on; unset follows the browser's language. */
  weekStart?: WeekStart;
}

interface NotesPreferences {
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  /** Pictures across the top of note cards. Unset (older saves) means on. */
  showPictures?: boolean;
  openArchivedTagIds: string[];
}

interface EditorPreferences {
  sortChecklistItems: boolean;
  /** Deleted notes burn away. Unset means off. */
  burnDeleted?: boolean;
  /** Sparks fly where cards strike into place after a delete. Unset means off. */
  strikeSparks?: boolean;
  /** Inserts today's date; unset means the default (Ctrl+;). */
  dateShortcut?: Shortcut;
  /** Inserts the date and time; unset means Ctrl+Shift+;. */
  dateTimeShortcut?: Shortcut;
  /** How an inserted date reads; unset means "Oct 28th 2026". */
  dateFormat?: DateFormat;
  /** Unset means the default layout. */
  noteLayout?: NoteLayout;
  /** The formatting bar, opened in the clean layout. */
  formattingOpen?: boolean;
  /**
   * Letter and symbol keys alone as shortcuts (C, /, F…), which speech input
   * can set off by mistake (WCAG 2.1.4). Unset means on.
   */
  singleKeyShortcuts?: boolean;
  /** A note's bar and More, each width unset until changed in Settings. */
  quickActions?: Partial<Record<BarWidth, QuickActionSetup>>;
  foldedChecklistNoteIds: string[];
}

interface PreferencesState {
  ui: UIPreferences;
  notes: NotesPreferences;
  editor: EditorPreferences;
  setUIPreference: <K extends keyof UIPreferences>(
    key: K,
    value: UIPreferences[K],
  ) => void;
  setNotesPreference: <K extends keyof NotesPreferences>(
    key: K,
    value: NotesPreferences[K],
  ) => void;
  setEditorPreference: <K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K],
  ) => void;
  setChecklistFolded: (noteId: string, isFolded: boolean) => void;
  setArchivedOpen: (tagId: string, isOpen: boolean) => void;
}

const defaultUIPreferences: UIPreferences = {
  sidebarCollapsed: false,
};

const defaultNotesPreferences: NotesPreferences = {
  viewMode: "masonry",
  sortBy: "updatedAt",
  sortOrder: "desc",
  showPictures: true,
  openArchivedTagIds: [],
};

const defaultEditorPreferences: EditorPreferences = {
  sortChecklistItems: true,
  burnDeleted: false,
  strikeSparks: false,
  foldedChecklistNoteIds: [],
};

const MAX_FOLDED_NOTES = 500;
const MAX_OPEN_TAGS = 200;

const updateIdList = (
  ids: string[],
  id: string,
  isIncluded: boolean,
  max: number,
) => {
  const others = ids.filter((other) => other !== id);
  return isIncluded ? [...others, id].slice(-max) : others;
};

const initialState = {
  ui: defaultUIPreferences,
  notes: defaultNotesPreferences,
  editor: defaultEditorPreferences,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...initialState,
      setUIPreference: (key, value) =>
        set((state) => ({
          ui: { ...state.ui, [key]: value },
        })),
      setNotesPreference: (key, value) =>
        set((state) => ({
          notes: { ...state.notes, [key]: value },
        })),
      setEditorPreference: (key, value) =>
        set((state) => ({
          editor: { ...state.editor, [key]: value },
        })),
      setChecklistFolded: (noteId, isFolded) =>
        set((state) => ({
          editor: {
            ...state.editor,
            foldedChecklistNoteIds: updateIdList(
              state.editor.foldedChecklistNoteIds,
              noteId,
              isFolded,
              MAX_FOLDED_NOTES,
            ),
          },
        })),
      setArchivedOpen: (tagId, isOpen) =>
        set((state) => ({
          notes: {
            ...state.notes,
            openArchivedTagIds: updateIdList(
              state.notes.openArchivedTagIds,
              tagId,
              isOpen,
              MAX_OPEN_TAGS,
            ),
          },
        })),
    }),
    {
      name: "preferences",
      // 1: burning deleted notes went from on to off by default. Every
      // earlier save holds the old default, so it starts over at the new one.
      version: 1,
      migrate: (persisted, version) => {
        const saved = (persisted ?? {}) as Partial<PreferencesState>;
        if (version < 1 && saved.editor) {
          const { burnDeleted: _burn, ...editor } = saved.editor;
          return { ...saved, editor } as PreferencesState;
        }
        return saved as PreferencesState;
      },
      // Settings added later get their defaults.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PreferencesState>;
        // The style setting before styles moved into the custom theme.
        const { style: _style, ...ui } = (saved.ui ?? {}) as UIPreferences & {
          style?: unknown;
        };
        return {
          ...current,
          ui: { ...current.ui, ...ui },
          notes: { ...current.notes, ...saved.notes },
          editor: { ...current.editor, ...saved.editor },
        };
      },
    },
  ),
);
