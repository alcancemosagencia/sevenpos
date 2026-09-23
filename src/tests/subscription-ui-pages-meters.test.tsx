import { describe, it, expect, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SubscriptionPage } from '../pages/SubscriptionPage';
import { UpgradePromptModal } from '../components/subscription/UpgradePromptModal';
import { UsageMeterCard } from '../components/subscription/UsageMeterCard';
import { PlanComparisonTable } from '../components/subscription/PlanComparisonTable';
import { ComingSoonRoadmap } from '../components/subscription/ComingSoonRoadmap';
import { DateRangeSelector } from '../components/ui/DateRangeSelector';
import { CountryProvider } from '../context/CountryContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { UsageOverview } from '../domain/subscription/Entitlement';

describe('Subscription UI - Components and Page', () => {
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

  const mockOverview: UsageOverview = {
    plan: 'FREE',
    planName: 'SevenPOS Free',
    products: {
      key: 'catalog.active_products',
      label: 'Productos activos',
      current: 45,
      limit: 100,
      isEnforced: true,
      percentage: 45,
      state: 'NORMAL',
      displayValue: '45 / 100',
    },
    customers: {
      key: 'customers.active',
      label: 'Clientes activos',
      current: 20,
      limit: 50,
      isEnforced: true,
      percentage: 40,
      state: 'NORMAL',
      displayValue: '20 / 50',
    },
    users: {
      key: 'users.active_operators',
      label: 'Usuarios del equipo',
      current: 1,
      limit: 1,
      isEnforced: true,
      percentage: 100,
      state: 'LIMIT_REACHED',
      displayValue: '1 / 1',
    },
    salesMilestone: {
      currentMonthlySales: 120,
      milestoneLevel: 'NORMAL',
      message: undefined,
    },
    historyWindow: {
      reportsDays: 7,
      auditDays: 3,
      displayLabel: '7 días incluidos',
    },
  };

  it('renders SubscriptionPage with banner, plan cards, meters, comparison, and roadmap', () => {
    const html = renderToString(
      <ThemeProvider>
        <CountryProvider>
          <AuthProvider>
            <SubscriptionPage />
          </AuthProvider>
        </CountryProvider>
      </ThemeProvider>
    );

    expect(html).toContain('Suscripción');
    expect(html).toContain('Verificando tu plan');
    expect(html).not.toContain('Plan actual');
    expect(html).toContain('Comparativa de Planes');
    expect(html).toContain('Próximamente en SevenPOS Pro');
    expect(html).not.toContain('Continuar con Mercado Pago');
  });

  it('renders UsageMeterCard with all 3 resource meters, sales volume, history, and device display', () => {
    const html = renderToString(
      <UsageMeterCard overview={mockOverview} onUpgradeClick={() => {}} />
    );

    expect(html).toContain('Productos activos');
    expect(html).toContain('Clientes activos');
    expect(html).toContain('Usuarios del equipo');
    expect(html).toContain('Ventas este mes');
    expect(html).toContain('Historial de reportes');
    expect(html).toContain('Terminales');
    expect(html).toContain('45');
    expect(html).toContain('de 100');
  });

  it('renders PlanComparisonTable with grouped categories', () => {
    const html = renderToString(
      <PlanComparisonTable />
    );

    expect(html).toContain('Operación y Ventas');
    expect(html).toContain('Equipo y Seguridad');
    expect(html).toContain('Control e Inteligencia');
    expect(html).toContain('Historial y Exportaciones');
  });

  it('renders ComingSoonRoadmap with all roadmap cards tagged Próximamente', () => {
    const html = renderToString(
      <ComingSoonRoadmap />
    );

    expect(html).toContain('Próximamente');
    expect(html).toContain('Mejora automática de imágenes con IA');
    expect(html).toContain('Tienda online pública');
    expect(html).toContain('Facturación electrónica SII (Chile)');
  });

  it('renders UpgradePromptModal when open without fake checkout or fake activation', () => {
    const html = renderToString(
      <UpgradePromptModal
        isOpen={true}
        onClose={() => {}}
        title="Desbloquea SevenPOS Pro"
        message="Lleva tu negocio al siguiente nivel sin límites operativos."
      />
    );

    expect(html).toContain('Desbloquea SevenPOS Pro');
    expect(html).toContain('Lleva tu negocio al siguiente nivel sin límites operativos.');
    expect(html).toContain('Conocer SevenPOS Pro');
    expect(html).toContain('Entendido');
  });

  it('renders DateRangeSelector with locked items and PRO badge', () => {
    const html = renderToString(
      <DateRangeSelector
        currentRange={{
          preset: 'LAST_7_DAYS',
          startDate: '2026-09-01',
          endDate: '2026-09-07',
          fromUtc: '2026-09-01T00:00:00.000Z',
          toUtc: '2026-09-07T23:59:59.999Z',
          label: 'Últimos 7 días',
        }}
        onRangeChange={() => {}}
        presets={[
          { key: 'LAST_7_DAYS', label: 'Últimos 7 días' },
          { key: 'LAST_30_DAYS', label: 'Últimos 30 días', locked: true, badge: 'PRO' },
        ]}
      />
    );

    expect(html).toContain('daterange-selector-btn');
    expect(html).toContain('Últimos 7 días');
  });
});
