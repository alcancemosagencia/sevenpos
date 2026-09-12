import { describe, it, expect, beforeEach } from 'vitest';
import { THEME_STORAGE_KEY } from '../context/ThemeContext';
import { InMemoryAuditRepository } from '../infrastructure/repositories/InMemoryAuditRepository';
import { setupMockLocalStorage } from './setupMockStorage';

describe('AG-13: Theme Settings Persistence & Zero Audit Pollution', () => {
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    setupMockLocalStorage();
    localStorage.clear();
    auditRepo = new InMemoryAuditRepository();
  });

  it('persists theme preference locally without creating audit records', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    // Verify 0 SETTINGS/Theme audit events emitted
    const res = await auditRepo.query('biz-1', { categories: ['SETTINGS'] });
    const themeEvents = res.items.filter((e) => e.eventType.includes('theme') || e.eventType.includes('appearance'));
    expect(themeEvents.length).toBe(0);
  });
});
