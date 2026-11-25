/** What keybindings check before a key acts: see features/keybindings. */

/**
 * Something on screen that an Esc or a letter key belongs to first; not one
 * already on its way out.
 */
const OVERLAYS = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
]
  .map((role) => `${role}:not([data-state="closed"])`)
  .concat(".hl-bubble")
  .join(", ");

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [contenteditable=true]") !== null
  );
}

export function hasOverlay() {
  return document.querySelector(OVERLAYS) !== null;
}
