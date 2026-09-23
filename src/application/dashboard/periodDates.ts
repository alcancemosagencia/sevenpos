export type DashboardPeriod = 'today' | 'week' | 'month';

import { businessDateYmd, businessDayEndUtc, businessDayStartUtc, shiftYmd } from '../../domain/common/time/BusinessCalendar';

export interface UtcDateRange {
  fromUtc: string;
  toUtc: string;
}

/**
 * Computes exact UTC ISO strings for local calendar periods ('today', 'week', 'month').
 * Handles business local timezone boundaries without clipping or date displacement.
 */
export function getPeriodUtcDateRange(period: DashboardPeriod, referenceDate: Date = new Date(), countryCode = 'CL'): UtcDateRange {
  const todayYmd = businessDateYmd(referenceDate, countryCode);
  if (period === 'today') {
    return { fromUtc: businessDayStartUtc(todayYmd, countryCode), toUtc: businessDayEndUtc(todayYmd, countryCode) };
  }
  if (period === 'month') {
    return { fromUtc: businessDayStartUtc(`${todayYmd.slice(0, 7)}-01`, countryCode), toUtc: businessDayEndUtc(todayYmd, countryCode) };
  }
  const [year, month, day] = todayYmd.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayYmd = shiftYmd(todayYmd, weekday === 0 ? -6 : 1 - weekday);
  return { fromUtc: businessDayStartUtc(mondayYmd, countryCode), toUtc: businessDayEndUtc(todayYmd, countryCode) };
}
