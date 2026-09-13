import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DateRangeSelector } from '../components/ui/DateRangeSelector';
import { resolveDateRange } from '../application/analytics/DateRangeUtils';

describe('Canonical DateRangeSelector Component', () => {
  it('renders correctly with generic options mode (Dashboard)', () => {
    const options = [
      { value: 'today', label: 'Hoy' },
      { value: 'week', label: 'Esta semana' },
      { value: 'month', label: 'Este mes' },
    ];

    const html = renderToString(
      <DateRangeSelector
        value="today"
        onChange={() => {}}
        options={options}
      />
    );

    expect(html).toContain('daterange-selector-btn');
    expect(html).toContain('Hoy');
  });

  it('renders correctly with analytics presets mode (Reports / Audit)', () => {
    const currentRange = resolveDateRange('THIS_MONTH');

    const html = renderToString(
      <DateRangeSelector
        currentRange={currentRange}
        onRangeChange={() => {}}
      />
    );

    expect(html).toContain('daterange-selector-btn');
    expect(html).toContain('Este mes');
  });
});
