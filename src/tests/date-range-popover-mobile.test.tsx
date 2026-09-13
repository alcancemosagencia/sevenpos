import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DateRangePickerDropdown } from '../components/analytics/DateRangePickerDropdown';
import { resolveDateRange } from '../application/analytics/DateRangeUtils';

describe('A2 & A3: Date Range Picker Popover and Mobile Dialog', () => {
  it('renders anchored popover button with formatted date range and preset options', () => {
    const range = resolveDateRange('TODAY');

    const html = renderToString(
      <DateRangePickerDropdown
        currentRange={range}
        onRangeChange={() => {}}
      />
    );

    expect(html).toContain('Hoy');
    expect(html).toContain('Rango de fechas actual: Hoy');
  });
});
