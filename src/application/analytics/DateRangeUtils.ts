import { DateRange, DateRangePreset, ComparisonPeriod } from './types';

function padZero(num: number): string {
  return String(num).padStart(2, '0');
}

export function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${year}-${month}-${day}`;
}

export function getStartOfDayUtc(ymd: string): string {
  // Use ISO representation for database comparison: YYYY-MM-DDT00:00:00.000Z
  return `${ymd}T00:00:00.000Z`;
}

export function getEndOfDayUtc(ymd: string): string {
  // Use ISO representation for database comparison: YYYY-MM-DDT23:59:59.999Z
  return `${ymd}T23:59:59.999Z`;
}

export function resolveDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date()
): DateRange {
  const now = new Date(referenceDate);
  const todayYMD = formatDateToYMD(now);

  switch (preset) {
    case 'TODAY': {
      return {
        preset: 'TODAY',
        startDate: todayYMD,
        endDate: todayYMD,
        fromUtc: getStartOfDayUtc(todayYMD),
        toUtc: getEndOfDayUtc(todayYMD),
        label: 'Hoy',
      };
    }
    case 'YESTERDAY': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const ymd = formatDateToYMD(y);
      return {
        preset: 'YESTERDAY',
        startDate: ymd,
        endDate: ymd,
        fromUtc: getStartOfDayUtc(ymd),
        toUtc: getEndOfDayUtc(ymd),
        label: 'Ayer',
      };
    }
    case 'LAST_7_DAYS': {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      const startYMD = formatDateToYMD(past);
      return {
        preset: 'LAST_7_DAYS',
        startDate: startYMD,
        endDate: todayYMD,
        fromUtc: getStartOfDayUtc(startYMD),
        toUtc: getEndOfDayUtc(todayYMD),
        label: 'Últimos 7 días',
      };
    }
    case 'LAST_30_DAYS': {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      const startYMD = formatDateToYMD(past);
      return {
        preset: 'LAST_30_DAYS',
        startDate: startYMD,
        endDate: todayYMD,
        fromUtc: getStartOfDayUtc(startYMD),
        toUtc: getEndOfDayUtc(todayYMD),
        label: 'Últimos 30 días',
      };
    }
    case 'THIS_MONTH': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const startYMD = formatDateToYMD(firstDay);
      return {
        preset: 'THIS_MONTH',
        startDate: startYMD,
        endDate: todayYMD,
        fromUtc: getStartOfDayUtc(startYMD),
        toUtc: getEndOfDayUtc(todayYMD),
        label: 'Este mes',
      };
    }
    case 'LAST_MONTH': {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const startYMD = formatDateToYMD(firstDayLastMonth);
      const endYMD = formatDateToYMD(lastDayLastMonth);
      return {
        preset: 'LAST_MONTH',
        startDate: startYMD,
        endDate: endYMD,
        fromUtc: getStartOfDayUtc(startYMD),
        toUtc: getEndOfDayUtc(endYMD),
        label: 'Mes anterior',
      };
    }
    case 'CUSTOM': {
      const s = customStart || todayYMD;
      const e = customEnd || todayYMD;
      return {
        preset: 'CUSTOM',
        startDate: s,
        endDate: e,
        fromUtc: getStartOfDayUtc(s),
        toUtc: getEndOfDayUtc(e),
        label: `${s} - ${e}`,
      };
    }
  }
}

export function resolveComparisonPeriod(range: DateRange): ComparisonPeriod {
  const start = new Date(range.startDate + 'T00:00:00');
  const end = new Date(range.endDate + 'T00:00:00');
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (range.preset === 'TODAY') {
    const y = new Date(start);
    y.setDate(y.getDate() - 1);
    const ymd = formatDateToYMD(y);
    return {
      fromUtc: getStartOfDayUtc(ymd),
      toUtc: getEndOfDayUtc(ymd),
      label: 'vs ayer',
    };
  }

  if (range.preset === 'THIS_MONTH') {
    const prevMonthFirst = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const prevMonthLast = new Date(start.getFullYear(), start.getMonth(), 0);
    const pStartYMD = formatDateToYMD(prevMonthFirst);
    const pEndYMD = formatDateToYMD(prevMonthLast);
    return {
      fromUtc: getStartOfDayUtc(pStartYMD),
      toUtc: getEndOfDayUtc(pEndYMD),
      label: 'vs mes anterior',
    };
  }

  // Generic previous period of equal duration
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (diffDays - 1));

  const pStartYMD = formatDateToYMD(prevStart);
  const pEndYMD = formatDateToYMD(prevEnd);

  return {
    fromUtc: getStartOfDayUtc(pStartYMD),
    toUtc: getEndOfDayUtc(pEndYMD),
    label: `vs período anterior (${diffDays}d)`,
  };
}

export function calculateDelta(current: number, previous: number): import('./types').MetricDelta {
  const absoluteDelta = current - previous;
  let percentageDelta: number | null = null;

  if (previous > 0) {
    percentageDelta = Number((((current - previous) / previous) * 100).toFixed(1));
  } else if (previous === 0 && current > 0) {
    percentageDelta = 100.0;
  } else if (previous === 0 && current === 0) {
    percentageDelta = 0.0;
  }

  let trend: 'UP' | 'DOWN' | 'FLAT' = 'FLAT';
  if (absoluteDelta > 0) trend = 'UP';
  else if (absoluteDelta < 0) trend = 'DOWN';

  return {
    current,
    previous,
    absoluteDelta,
    percentageDelta,
    trend,
  };
}
