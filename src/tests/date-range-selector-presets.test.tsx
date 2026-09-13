import { describe, it, expect } from 'vitest';
import { resolveDateRange } from '../application/analytics/DateRangeUtils';

describe('DateRangeSelector Presets Resolution', () => {
  const presets: Array<{ key: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH'; label: string }> = [
    { key: 'TODAY', label: 'Hoy' },
    { key: 'YESTERDAY', label: 'Ayer' },
    { key: 'LAST_7_DAYS', label: 'Últimos 7 días' },
    { key: 'LAST_30_DAYS', label: 'Últimos 30 días' },
    { key: 'THIS_MONTH', label: 'Este mes' },
    { key: 'LAST_MONTH', label: 'Mes anterior' },
  ];

  presets.forEach(({ key, label }) => {
    it(`resolves preset ${key} (${label}) correctly with proper ISO ranges`, () => {
      const result = resolveDateRange(key);
      expect(result.preset).toBe(key);
      expect(result.label).toBe(label);
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
      expect(result.fromUtc).toContain('T00:00:00.000Z');
      expect(result.toUtc).toContain('T23:59:59.999Z');
    });
  });
});
