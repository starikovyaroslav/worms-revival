/** Dialogs of the in-match Esc menu. While one is open the game is paused. */
export type Dialog = 'menu' | 'controls' | 'sound' | 'quit' | 'surrender';

export interface EscResult {
  dialog: Dialog | null;
  closePanel: boolean;
}

/**
 * What the Esc key does: close the weapon panel first; otherwise open the menu; inside the menu go
 * one step back (sub-screens and the quit confirmation return to the menu, the menu resumes, a
 * surrender confirmation is cancelled).
 */
export function onEscape(dialog: Dialog | null, panelOpen: boolean): EscResult {
  if (dialog === 'menu' || dialog === 'surrender') return { dialog: null, closePanel: false };
  if (dialog) return { dialog: 'menu', closePanel: false };
  if (panelOpen) return { dialog: null, closePanel: true };
  return { dialog: 'menu', closePanel: false };
}
