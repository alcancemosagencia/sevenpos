import { describe, it, expect } from 'vitest';
import { resolveDateRange } from '../application/analytics/DateRangeUtils';

describe('DateRangeSelector Custom Date Resolution Flow', () => {
  it('resolves CUSTOM preset correctly with custom start and end dates', () => {
    const customStart = '2026-01-01';
    const customEnd = '2026-01-15';

    const result = resolveDateRange('CUSTOM', customStart, customEnd);
    expect(result.preset).toBe('CUSTOM');
    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBe('2026-01-15');
    expect(result.fromUtc).toBe('2026-01-01T00:00:00.000Z');
    expect(result.toUtc).toBe('2026-01-15T23:59:59.999Z');
    expect(result.label).toBe('2026-01-01 - 2026-01-15');
  });
});
