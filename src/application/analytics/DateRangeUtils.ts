import { DateRange, DateRangePreset, ComparisonPeriod } from './types';
import { businessDateYmd, businessDayEndUtc, businessDayStartUtc, shiftYmd } from '../../domain/common/time/BusinessCalendar';

function padZero(num: number): string {
  return String(num).padStart(2, '0');
}

export function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${year}-${month}-${day}`;
}

export function getStartOfDayUtc(ymd: string, countryCode?: string): string {
  return countryCode ? businessDayStartUtc(ymd, countryCode) : `${ymd}T00:00:00.000Z`;
}

export function getEndOfDayUtc(ymd: string, countryCode?: string): string {
  return countryCode ? businessDayEndUtc(ymd, countryCode) : `${ymd}T23:59:59.999Z`;
}

export function resolveDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date(),
  countryCode?: string
): DateRange {
  const now = new Date(referenceDate);
  const todayYMD = countryCode ? businessDateYmd(now, countryCode) : formatDateToYMD(now);
  const start = (ymd: string) => getStartOfDayUtc(ymd, countryCode);
  const end = (ymd: string) => getEndOfDayUtc(ymd, countryCode);
  const withCountry = countryCode ? { countryCode } : {};

  switch (preset) {
    case 'TODAY': {
      return {
        preset: 'TODAY',
        startDate: todayYMD,
        endDate: todayYMD,
        fromUtc: start(todayYMD),
        toUtc: end(todayYMD),
        label: 'Hoy',
        ...withCountry,
      };
    }
    case 'YESTERDAY': {
      const ymd = shiftYmd(todayYMD, -1);
      return {
        preset: 'YESTERDAY',
        startDate: ymd,
        endDate: ymd,
        fromUtc: start(ymd),
        toUtc: end(ymd),
        label: 'Ayer',
        ...withCountry,
      };
    }
    case 'LAST_7_DAYS': {
      const startYMD = shiftYmd(todayYMD, -6);
      return {
        preset: 'LAST_7_DAYS',
        startDate: startYMD,
        endDate: todayYMD,
        fromUtc: start(startYMD),
        toUtc: end(todayYMD),
        label: 'Últimos 7 días',
        ...withCountry,
      };
    }
    case 'LAST_30_DAYS': {
      const startYMD = shiftYmd(todayYMD, -29);
      return {
        preset: 'LAST_30_DAYS',
        startDate: startYMD,
        endDate: todayYMD,
        fromUtc: start(startYMD),
        toUtc: end(todayYMD),
        label: 'Últimos 30 días',
        ...withCountry,
      };
    }
    case 'THIS_MONTH': {
      const startYMD = `${todayYMD.slice(0, 7)}-01`;
      return {
        preset: 'THIS_MONTH',
        startDate: startYMD,
        endDate: todayYMD,
        fromUtc: start(startYMD),
        toUtc: end(todayYMD),
        label: 'Este mes',
        ...withCountry,
      };
    }
    case 'LAST_MONTH': {
      const endYMD = shiftYmd(`${todayYMD.slice(0, 7)}-01`, -1);
      const startYMD = `${endYMD.slice(0, 7)}-01`;
      return {
        preset: 'LAST_MONTH',
        startDate: startYMD,
        endDate: endYMD,
        fromUtc: start(startYMD),
        toUtc: end(endYMD),
        label: 'Mes anterior',
        ...withCountry,
      };
    }
    case 'CUSTOM': {
      const s = customStart || todayYMD;
      const e = customEnd || todayYMD;
      return {
        preset: 'CUSTOM',
        startDate: s,
        endDate: e,
        fromUtc: start(s),
        toUtc: end(e),
        label: `${s} - ${e}`,
        ...withCountry,
      };
    }
  }
}

export function resolveComparisonPeriod(range: DateRange): ComparisonPeriod {
  const start = new Date(`${range.startDate}T00:00:00.000Z`);
  const end = new Date(`${range.endDate}T00:00:00.000Z`);
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  if (range.preset === 'TODAY') {
    const ymd = shiftYmd(range.startDate, -1);
    return {
      fromUtc: getStartOfDayUtc(ymd, range.countryCode),
      toUtc: getEndOfDayUtc(ymd, range.countryCode),
      label: 'vs ayer',
    };
  }

  if (range.preset === 'THIS_MONTH') {
    const pEndYMD = shiftYmd(range.startDate, -1);
    const pStartYMD = `${pEndYMD.slice(0, 7)}-01`;
    return {
      fromUtc: getStartOfDayUtc(pStartYMD, range.countryCode),
      toUtc: getEndOfDayUtc(pEndYMD, range.countryCode),
      label: 'vs mes anterior',
    };
  }

  // Generic previous period of equal duration
  const pEndYMD = shiftYmd(range.startDate, -1);
  const pStartYMD = shiftYmd(pEndYMD, -(diffDays - 1));

  return {
    fromUtc: getStartOfDayUtc(pStartYMD, range.countryCode),
    toUtc: getEndOfDayUtc(pEndYMD, range.countryCode),
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
