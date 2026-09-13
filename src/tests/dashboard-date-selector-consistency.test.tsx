import { describe, it, expect, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DashboardPage } from '../pages/DashboardPage';
import { CountryProvider } from '../context/CountryContext';
import { ThemeProvider } from '../context/ThemeContext';

describe('Dashboard Date Selector Consistency', () => {
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

  it('renders canonical DateRangeSelector on Dashboard with trigger button and initial value', () => {
    const html = renderToString(
      <ThemeProvider>
        <CountryProvider>
          <DashboardPage />
        </CountryProvider>
      </ThemeProvider>
    );

    expect(html).toContain('daterange-selector-btn');
    expect(html).toContain('Hoy');
  });
});
