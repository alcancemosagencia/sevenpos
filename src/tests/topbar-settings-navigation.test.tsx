import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Topbar } from '../components/shell/Topbar';
import { ThemeProvider } from '../context/ThemeContext';

describe('A10: Topbar Settings Icon & Cashier Guarding', () => {
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

  it('renders settings icon when canManageSettings is true and onOpenSettings is provided', () => {
    const onSettings = vi.fn();
    const html = renderToString(
      <ThemeProvider>
        <Topbar
          pageTitle="Panel Principal"
          isSidebarCollapsed={false}
          onToggleSidebar={() => {}}
          canManageSettings={true}
          onOpenSettings={onSettings}
        />
      </ThemeProvider>
    );

    expect(html).toContain('aria-label="Configuración"');
  });

  it('hides settings icon when canManageSettings is false (Cashier role)', () => {
    const onSettings = vi.fn();
    const html = renderToString(
      <ThemeProvider>
        <Topbar
          pageTitle="Punto de Venta"
          isSidebarCollapsed={false}
          onToggleSidebar={() => {}}
          canManageSettings={false}
          onOpenSettings={onSettings}
        />
      </ThemeProvider>
    );

    expect(html).not.toContain('aria-label="Configuración"');
  });
});
