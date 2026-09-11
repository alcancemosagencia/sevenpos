import { describe, it, expect } from 'vitest';
import { resolveDateRange } from '../application/analytics/DateRangeUtils';

describe('AG-12D: Audit Date Presets & Local Boundaries', () => {
  it('should resolve all required presets with accurate local boundaries', () => {
    const fixedDate = new Date(2026, 8, 10, 14, 30, 0); // 10 Sept 2026 14:30:00 local time
    const todayYMD = '2026-09-10';

    // 1. TODAY (Hoy)
    const todayRange = resolveDateRange('TODAY', undefined, undefined, fixedDate);
    expect(todayRange.preset).toBe('TODAY');
    expect(todayRange.startDate).toBe(todayYMD);
    expect(todayRange.endDate).toBe(todayYMD);
    expect(todayRange.fromUtc).toBe('2026-09-10T00:00:00.000Z');
    expect(todayRange.toUtc).toBe('2026-09-10T23:59:59.999Z');
    expect(todayRange.label).toBe('Hoy');

    // 2. YESTERDAY (Ayer)
    const yesterdayRange = resolveDateRange('YESTERDAY', undefined, undefined, fixedDate);
    expect(yesterdayRange.preset).toBe('YESTERDAY');
    expect(yesterdayRange.startDate).toBe('2026-09-09');
    expect(yesterdayRange.endDate).toBe('2026-09-09');
    expect(yesterdayRange.fromUtc).toBe('2026-09-09T00:00:00.000Z');
    expect(yesterdayRange.toUtc).toBe('2026-09-09T23:59:59.999Z');
    expect(yesterdayRange.label).toBe('Ayer');

    // 3. LAST_7_DAYS (Últimos 7 días)
    const last7DaysRange = resolveDateRange('LAST_7_DAYS', undefined, undefined, fixedDate);
    expect(last7DaysRange.preset).toBe('LAST_7_DAYS');
    expect(last7RangeStartDate(last7DaysRange.startDate)).toBe('2026-09-04');
    expect(last7DaysRange.endDate).toBe(todayYMD);
    expect(last7DaysRange.fromUtc).toBe('2026-09-04T00:00:00.000Z');
    expect(last7DaysRange.toUtc).toBe('2026-09-10T23:59:59.999Z');
    expect(last7DaysRange.label).toBe('Últimos 7 días');

    // 4. LAST_30_DAYS (Últimos 30 días)
    const last30DaysRange = resolveDateRange('LAST_30_DAYS', undefined, undefined, fixedDate);
    expect(last30DaysRange.preset).toBe('LAST_30_DAYS');
    expect(last30DaysRange.startDate).toBe('2026-08-12');
    expect(last30DaysRange.endDate).toBe(todayYMD);
    expect(last30DaysRange.fromUtc).toBe('2026-08-12T00:00:00.000Z');
    expect(last30DaysRange.toUtc).toBe('2026-09-10T23:59:59.999Z');
    expect(last30DaysRange.label).toBe('Últimos 30 días');

    // 5. THIS_MONTH (Este mes)
    const thisMonthRange = resolveDateRange('THIS_MONTH', undefined, undefined, fixedDate);
    expect(thisMonthRange.preset).toBe('THIS_MONTH');
    expect(thisMonthRange.startDate).toBe('2026-09-01');
    expect(thisMonthRange.endDate).toBe(todayYMD);
    expect(thisMonthRange.fromUtc).toBe('2026-09-01T00:00:00.000Z');
    expect(thisMonthRange.toUtc).toBe('2026-09-10T23:59:59.999Z');
    expect(thisMonthRange.label).toBe('Este mes');

    // 6. CUSTOM (Personalizado)
    const customRange = resolveDateRange('CUSTOM', '2026-09-01', '2026-09-05', fixedDate);
    expect(customRange.preset).toBe('CUSTOM');
    expect(customRange.startDate).toBe('2026-09-01');
    expect(customRange.endDate).toBe('2026-09-05');
    expect(customRange.fromUtc).toBe('2026-09-01T00:00:00.000Z');
    expect(customRange.toUtc).toBe('2026-09-05T23:59:59.999Z');
  });
});

function last7RangeStartDate(val: string) {
  return val;
}
