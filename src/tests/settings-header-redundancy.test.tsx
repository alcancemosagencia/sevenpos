import { describe, it, expect, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SettingsPage } from '../pages/SettingsPage';
import { ThemeProvider } from '../context/ThemeContext';
import { CountryProvider } from '../context/CountryContext';
import { AuthProvider } from '../context/AuthContext';
import { OperationalSessionProvider } from '../context/OperationalSessionContext';

describe('A1: Settings Header Redundancy Hotfix', () => {
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

  it('does NOT render redundant CONFIGURACION eyebrow header', () => {
    const html = renderToString(
      <ThemeProvider>
        <CountryProvider>
          <AuthProvider>
            <OperationalSessionProvider>
              <SettingsPage />
            </OperationalSessionProvider>
          </AuthProvider>
        </CountryProvider>
      </ThemeProvider>
    );

    expect(html).not.toContain('CONFIGURACIÓN');
    expect(html).not.toContain('CONFIGURACION');
    expect(html).toContain('Configuración');
  });
});
