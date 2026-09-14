import { SupportedCountryCode } from '../../types/country';

export interface LocalMonthInterval {
  startOfLocalMonth: string; // ISO UTC string, e.g. 2026-09-01T04:00:00.000Z (Santiago UTC-4 / UTC-3)
  startOfNextLocalMonth: string; // ISO UTC string, e.g. 2026-10-01T03:00:00.000Z
  localYear: number;
  localMonth: number; // 1-12
  timezone: string;
}

export const COUNTRY_TIMEZONE_MAP: Record<SupportedCountryCode, string> = {
  CL: 'America/Santiago',
  CO: 'America/Bogota',
  VE: 'America/Caracas',
};

export function getTimezoneForCountry(countryCode?: string): string {
  if (countryCode && countryCode in COUNTRY_TIMEZONE_MAP) {
    return COUNTRY_TIMEZONE_MAP[countryCode as SupportedCountryCode];
  }
  return 'America/Santiago'; // Default canonical timezone for SevenPOS
}

/**
 * Calculates the half-open interval [startOfLocalMonth, startOfNextLocalMonth) in UTC ISO format
 * for the calendar month containing referenceDate in the business's local timezone.
 */
export function getLocalMonthInterval(
  countryCode?: string,
  referenceDate: Date = new Date()
): LocalMonthInterval {
  const timeZone = getTimezoneForCountry(countryCode);

  // Format parts in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const localYear = parseInt(partMap.year, 10);
  const localMonth = parseInt(partMap.month, 10);

  // Start of current month in local time: YYYY-MM-01 00:00:00
  const startOfThisMonthUtc = getUtcIsoFromLocalParts(localYear, localMonth, 1, 0, 0, 0, timeZone);

  // Start of next month in local time:
  const nextMonth = localMonth === 12 ? 1 : localMonth + 1;
  const nextYear = localMonth === 12 ? localYear + 1 : localYear;
  const startOfNextMonthUtc = getUtcIsoFromLocalParts(nextYear, nextMonth, 1, 0, 0, 0, timeZone);

  return {
    startOfLocalMonth: startOfThisMonthUtc,
    startOfNextLocalMonth: startOfNextMonthUtc,
    localYear,
    localMonth,
    timezone: timeZone,
  };
}

/**
 * Converts local date parts in a given timezone to a UTC ISO string.
 */
function getUtcIsoFromLocalParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): string {
  // Construct approximate UTC date
  const approximateUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // Determine timezone offset at that moment using Intl
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(approximateUtc);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = parseInt(p.value, 10);
    }
  }

  const localHoursAsUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour === 24 ? 0 : map.hour, map.minute, map.second);
  const diffMs = approximateUtc.getTime() - localHoursAsUtc;

  // Exact UTC timestamp corresponding to local midnight
  const exactUtcDate = new Date(approximateUtc.getTime() + diffMs);
  return exactUtcDate.toISOString();
}
