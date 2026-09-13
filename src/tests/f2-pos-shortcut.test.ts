import { describe, it, expect } from 'vitest';
import { isEditableTarget } from '../utils/keyboard';

describe('A4–A6: F2 Global POS Shortcut & isEditableTarget guard', () => {
  it('returns false for null or non-object targets', () => {
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(undefined)).toBe(false);
    expect(isEditableTarget(123 as unknown)).toBe(false);
  });

  it('detects input, textarea, and select as editable targets', () => {
    const input = { tagName: 'INPUT' };
    const textarea = { tagName: 'TEXTAREA' };
    const select = { tagName: 'SELECT' };
    const div = { tagName: 'DIV' };

    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(textarea)).toBe(true);
    expect(isEditableTarget(select)).toBe(true);
    expect(isEditableTarget(div)).toBe(false);
  });

  it('detects contenteditable elements as editable targets', () => {
    const div = { tagName: 'DIV', isContentEditable: true };
    expect(isEditableTarget(div)).toBe(true);
  });

  it('detects role=textbox, role=combobox, and role=searchbox as editable targets', () => {
    const createRoleTarget = (role: string) => ({
      tagName: 'DIV',
      getAttribute: (attr: string) => (attr === 'role' ? role : null),
    });

    expect(isEditableTarget(createRoleTarget('textbox'))).toBe(true);
    expect(isEditableTarget(createRoleTarget('combobox'))).toBe(true);
    expect(isEditableTarget(createRoleTarget('searchbox'))).toBe(true);
    expect(isEditableTarget(createRoleTarget('button'))).toBe(false);
  });
});
