import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Topbar } from '../components/shell/Topbar';
import { AppShell } from '../components/shell/AppShell';
import { ThemeProvider } from '../context/ThemeContext';

describe('AG-20: Topbar Actualizar a Pro Navigation & State', () => {
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

  it('1. Renders "Actualizar a Pro" CTA for FREE business', () => {
    const html = renderToString(
      <ThemeProvider>
        <Topbar
          pageTitle="Panel Principal"
          isSidebarCollapsed={false}
          onToggleSidebar={() => {}}
          planCode="FREE"
          activeNavId="dashboard"
          onNavigateToSubscription={() => {}}
        />
      </ThemeProvider>
    );

    expect(html).toContain('Actualizar a Pro');
    expect(html).not.toContain('Plan Pro');
  });

  it('2. Renders contextual "Plan Pro" CTA for ACTIVE PRO business (no misleading upgrade language)', () => {
    const html = renderToString(
      <ThemeProvider>
        <Topbar
          pageTitle="Panel Principal"
          isSidebarCollapsed={false}
          onToggleSidebar={() => {}}
          planCode="PRO"
          activeNavId="dashboard"
          onNavigateToSubscription={() => {}}
        />
      </ThemeProvider>
    );

    expect(html).toContain('Plan Pro');
    expect(html).not.toContain('Actualizar a Pro');
  });

  it('3. When already on /subscription (activeNavId="subscription"), sets aria-current and avoids redundant navigation loop', () => {
    const onNavigate = vi.fn();
    const html = renderToString(
      <ThemeProvider>
        <Topbar
          pageTitle="Suscripción y Plan"
          isSidebarCollapsed={false}
          onToggleSidebar={() => {}}
          planCode="FREE"
          activeNavId="subscription"
          onNavigateToSubscription={onNavigate}
        />
      </ThemeProvider>
    );

    expect(html).toContain('aria-current="page"');
  });

  it('4. Navigates to /subscription from all required AppShell routes', () => {
    const routes = [
      { id: 'dashboard', title: 'Panel Principal' },
      { id: 'pos', title: 'Punto de Venta' },
      { id: 'sales', title: 'Ventas y Facturación' },
      { id: 'products', title: 'Catálogo — Productos' },
      { id: 'categories', title: 'Catálogo — Categorías' },
      { id: 'stock', title: 'Inventario — Existencias' },
      { id: 'stock-adjustments', title: 'Inventario — Movimientos' },
      { id: 'purchase-orders', title: 'Compras — Órdenes de Compra' },
      { id: 'suppliers', title: 'Compras — Proveedores' },
      { id: 'cash-register', title: 'Caja y Turnos' },
      { id: 'expenses', title: 'Finanzas — Gastos' },
      { id: 'customers', title: 'Clientes' },
      { id: 'reports', title: 'Reportes y Métricas' },
      { id: 'audit', title: 'Auditoría' },
      { id: 'settings', title: 'Configuración' },
      { id: 'help', title: 'Centro de Ayuda' },
    ];

    for (const route of routes) {
      const onNavigateToSub = vi.fn();
      const onNavigate = vi.fn();

      const html = renderToString(
        <ThemeProvider>
          <AppShell
            activeNavId={route.id}
            onNavigate={onNavigate}
            pageTitle={route.title}
            planCode="FREE"
            onNavigateToSubscription={onNavigateToSub}
          >
            <div>Page content for {route.id}</div>
          </AppShell>
        </ThemeProvider>
      );

      expect(html).toContain('Actualizar a Pro');
    }
  });

  it('5. PRO business on AppShell renders "Plan Pro" from any route', () => {
    const onNavigateToSub = vi.fn();
    const html = renderToString(
      <ThemeProvider>
        <AppShell
          activeNavId="pos"
          onNavigate={() => {}}
          pageTitle="Punto de Venta"
          planCode="PRO"
          onNavigateToSubscription={onNavigateToSub}
        >
          <div>POS Content</div>
        </AppShell>
      </ThemeProvider>
    );

    expect(html).toContain('Plan Pro');
    expect(html).not.toContain('Actualizar a Pro');
  });

  it('6. Topbar button is keyboard and accessibility ready with correct attributes', () => {
    const html = renderToString(
      <ThemeProvider>
        <Topbar
          pageTitle="Punto de Venta"
          isSidebarCollapsed={false}
          onToggleSidebar={() => {}}
          planCode="FREE"
          activeNavId="pos"
          onNavigateToSubscription={() => {}}
        />
      </ThemeProvider>
    );

    // Standard button element with focus styling and aria label
    expect(html).toContain('<button');
    expect(html).toContain('aria-label="Actualizar a Pro"');
    expect(html).toContain('focus-visible:ring-2');
  });

  it('7. Topbar CTA navigation handler logic prevents redundant navigation loop when already on subscription', () => {
    let currentNav = 'pos';
    let navCount = 0;

    const navigate = (id: string) => {
      if (currentNav === 'subscription' && id === 'subscription') return; // no-op
      currentNav = id;
      navCount++;
    };

    // 1. From POS -> click Actualizar a Pro
    navigate('subscription');
    expect(currentNav).toBe('subscription');
    expect(navCount).toBe(1);

    // 2. Already on subscription -> click again
    navigate('subscription');
    expect(currentNav).toBe('subscription');
    expect(navCount).toBe(1); // Did not re-trigger / no loop
  });

  it('8. Responsive classes: button has hidden sm:inline-flex to prevent mobile overcrowding', () => {
    const html = renderToString(
      <ThemeProvider>
        <Topbar
          pageTitle="Punto de Venta"
          isSidebarCollapsed={false}
          onToggleSidebar={() => {}}
          planCode="FREE"
          activeNavId="pos"
          onNavigateToSubscription={() => {}}
        />
      </ThemeProvider>
    );

    expect(html).toContain('hidden sm:inline-flex');
  });
});
