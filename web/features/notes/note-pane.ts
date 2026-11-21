import { createContext } from "react";

/**
 * Columns: the open note stays mounted but hidden while notes are picked, and
 * its keys (Esc, Delete, E, F…) are then the selection's, not the note's.
 */
export const NotePaneHidden = createContext(false);
