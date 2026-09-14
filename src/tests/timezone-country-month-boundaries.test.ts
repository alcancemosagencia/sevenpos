import { describe, it, expect } from 'vitest';
import { getTimezoneForCountry, getLocalMonthInterval } from '../application/subscription/TimezoneUtils';

describe('Timezone & Country Month Boundaries Arithmetic', () => {
  it('maps CL, CO, VE to correct canonical IANA timezones', () => {
    expect(getTimezoneForCountry('CL')).toBe('America/Santiago');
    expect(getTimezoneForCountry('CO')).toBe('America/Bogota');
    expect(getTimezoneForCountry('VE')).toBe('America/Caracas');
    expect(getTimezoneForCountry(undefined)).toBe('America/Santiago'); // Fallback
  });

  it('calculates valid UTC boundaries for monthly sales interval [startOfLocalMonth, startOfNextLocalMonth)', () => {
    const referenceDate = new Date('2026-09-15T12:00:00Z');

    // Chile
    const clBounds = getLocalMonthInterval('CL', referenceDate);
    expect(new Date(clBounds.startOfLocalMonth).getTime()).toBeLessThan(
      new Date(clBounds.startOfNextLocalMonth).getTime()
    );
    expect(clBounds.timezone).toBe('America/Santiago');

    // Colombia
    const coBounds = getLocalMonthInterval('CO', referenceDate);
    expect(new Date(coBounds.startOfLocalMonth).getTime()).toBeLessThan(
      new Date(coBounds.startOfNextLocalMonth).getTime()
    );
    expect(coBounds.timezone).toBe('America/Bogota');

    // Venezuela
    const veBounds = getLocalMonthInterval('VE', referenceDate);
    expect(new Date(veBounds.startOfLocalMonth).getTime()).toBeLessThan(
      new Date(veBounds.startOfNextLocalMonth).getTime()
    );
    expect(veBounds.timezone).toBe('America/Caracas');
  });
});
