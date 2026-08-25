/**
 * Formats current time into canonical ISO-8601 UTC string.
 */
export function getCurrentUtcIsoString(): string {
  return new Date().toISOString();
}

export const getCurrentTimestamp = getCurrentUtcIsoString;

/**
 * Validates whether a string is a valid ISO timestamp.
 */
export function isValidIsoTimestamp(isoString: string): boolean {
  const parsed = Date.parse(isoString);
  return !Number.isNaN(parsed);
}
