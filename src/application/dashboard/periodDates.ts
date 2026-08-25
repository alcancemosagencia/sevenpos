export type DashboardPeriod = 'today' | 'week' | 'month';

export interface UtcDateRange {
  fromUtc: string;
  toUtc: string;
}

/**
 * Computes exact UTC ISO strings for local calendar periods ('today', 'week', 'month').
 * Handles business local timezone boundaries without clipping or date displacement.
 */
export function getPeriodUtcDateRange(period: DashboardPeriod, referenceDate: Date = new Date()): UtcDateRange {
  const localYear = referenceDate.getFullYear();
  const localMonth = referenceDate.getMonth();
  const localDate = referenceDate.getDate();

  let startLocal: Date;
  let endLocal: Date;

  if (period === 'today') {
    startLocal = new Date(localYear, localMonth, localDate, 0, 0, 0, 0);
    endLocal = new Date(localYear, localMonth, localDate, 23, 59, 59, 999);
  } else if (period === 'week') {
    // Current week: Start on Monday
    const day = referenceDate.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    startLocal = new Date(localYear, localMonth, localDate + diffToMonday, 0, 0, 0, 0);
    endLocal = new Date(localYear, localMonth, localDate + diffToMonday + 6, 23, 59, 59, 999);
  } else {
    // Current month: 1st of month to last day
    startLocal = new Date(localYear, localMonth, 1, 0, 0, 0, 0);
    const lastDayOfMonth = new Date(localYear, localMonth + 1, 0).getDate();
    endLocal = new Date(localYear, localMonth, lastDayOfMonth, 23, 59, 59, 999);
  }

  return {
    fromUtc: startLocal.toISOString(),
    toUtc: endLocal.toISOString(),
  };
}
