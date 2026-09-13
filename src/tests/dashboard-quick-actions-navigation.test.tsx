import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DashboardQuickActions } from '../features/dashboard/DashboardQuickActions';
import { DashboardPage } from '../pages/DashboardPage';
import { CountryProvider } from '../context/CountryContext';
import { ThemeProvider } from '../context/ThemeContext';

describe('A9: Dashboard Quick Actions Navigation', () => {
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

  it('renders quick action buttons for Nueva Venta, Agregar Inventario, and Ver Reportes', () => {
    const html = renderToString(
      <DashboardQuickActions
        onNewSale={() => {}}
        onAddInventory={() => {}}
        onViewReports={() => {}}
      />
    );

    expect(html).toContain('Nueva venta');
    expect(html).toContain('Agregar inventario');
    expect(html).toContain('Ver reportes');
  });

  it('DashboardPage accepts onNavigateToInventory and onNavigateToReports props', () => {
    const onNavInv = vi.fn();
    const onNavRep = vi.fn();
    const onNavPos = vi.fn();

    const html = renderToString(
      <ThemeProvider>
        <CountryProvider>
          <DashboardPage
            onNavigateToPos={onNavPos}
            onNavigateToInventory={onNavInv}
            onNavigateToReports={onNavRep}
          />
        </CountryProvider>
      </ThemeProvider>
    );

    expect(html).toContain('Panel Principal');
    expect(html).toContain('Agregar inventario');
    expect(html).toContain('Ver reportes');
  });
});
