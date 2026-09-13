import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AuditFilterToolbar } from '../features/audit/components/AuditFilterToolbar';
import { resolveDateRange } from '../application/analytics/DateRangeUtils';

describe('Audit Date Selector Consistency', () => {
  beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
      globalThis.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null,
      } as unknown as Storage;
    }
  });

  it('renders canonical DateRangeSelector on Audit toolbar with trigger button and range label', () => {
    const range = resolveDateRange('THIS_MONTH');
    const onDateRangeChange = vi.fn();

    const html = renderToString(
      <AuditFilterToolbar
        searchTerm=""
        onSearchChange={() => {}}
        activeTab="todos"
        selectedCategory=""
        onCategoryChange={() => {}}
        selectedSeverity=""
        onSeverityChange={() => {}}
        dateRange={range}
        onDateRangeChange={onDateRangeChange}
        onRefresh={() => {}}
        onExportCsv={() => {}}
      />
    );

    expect(html).toContain('daterange-selector-btn');
    expect(html).toContain('Este mes');
  });
});
