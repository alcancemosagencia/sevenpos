/**
 * Helper to determine if an event target is an editable form element or contenteditable area.
 * Used to safely guard global keyboard shortcuts (e.g., F2).
 */
export function isEditableTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }

  const elem = target as {
    tagName?: unknown;
    isContentEditable?: unknown;
    getAttribute?: (attr: string) => string | null;
  };

  const tagName = typeof elem.tagName === 'string' ? elem.tagName.toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  if (elem.isContentEditable) {
    return true;
  }

  const role = typeof elem.getAttribute === 'function' ? elem.getAttribute('role')?.toLowerCase() : undefined;
  if (role === 'textbox' || role === 'combobox' || role === 'searchbox') {
    return true;
  }

  return false;
}
