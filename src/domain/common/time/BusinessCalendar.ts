import { getTimezoneForCountry } from '../../../application/subscription/TimezoneUtils';

export function businessDateYmd(instant: Date, countryCode: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: getTimezoneForCountry(countryCode),
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const value = (part: string) => parts.find((entry) => entry.type === part)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function shiftYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Start of a business calendar date, expressed as an absolute UTC instant. */
export function businessDayStartUtc(ymd: string, countryCode: string): string {
  const timeZone = getTimezoneForCountry(countryCode);
  const [year, month, day] = ymd.split('-').map(Number);
  const desiredLocalAsUtc = Date.UTC(year, month - 1, day);
  let candidate = desiredLocalAsUtc;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(candidate));
    const value = (part: string) => Number(parts.find((entry) => entry.type === part)?.value);
    const observedLocalAsUtc = Date.UTC(
      value('year'), value('month') - 1, value('day'),
      value('hour'), value('minute'), value('second'),
    );
    const correction = desiredLocalAsUtc - observedLocalAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }
  return new Date(candidate).toISOString();
}

export function businessDayEndUtc(ymd: string, countryCode: string): string {
  return new Date(Date.parse(businessDayStartUtc(shiftYmd(ymd, 1), countryCode)) - 1).toISOString();
}
