/**
 * Keyboard helpers shared by the shell and the dialogs. Kept dependency-free
 * so they can be unit tested without a DOM.
 */

type EditableElement = {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
};

/**
 * True when the event target is a field in which the user is writing. Global
 * shortcuts must not hijack these targets, otherwise typing a letter would run
 * a command instead of inserting the character.
 */
export function isTypingTarget(target: unknown): boolean {
  const element = target as EditableElement | null;
  if (!element || typeof element !== "object") return false;
  const tag = (element.tagName ?? "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (element.isContentEditable) return true;
  if (typeof element.closest === "function") {
    try {
      return Boolean(element.closest('input, textarea, select, [contenteditable="true"]'));
    } catch {
      return false;
    }
  }
  return false;
}
