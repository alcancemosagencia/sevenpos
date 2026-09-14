import { describe, it, expect, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReportsPage } from '../pages/ReportsPage';
import { CountryProvider } from '../context/CountryContext';
import { ThemeProvider } from '../context/ThemeContext';

describe('Reports Date Selector Consistency', () => {
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

  it('renders canonical DateRangeSelector on Reports page with trigger button and default range', () => {
    const html = renderToString(
      <ThemeProvider>
        <CountryProvider>
          <ReportsPage />
        </CountryProvider>
      </ThemeProvider>
    );

    expect(html).toContain('daterange-selector-btn');
    expect(html).toContain('Últimos 7 días');
  });
});
