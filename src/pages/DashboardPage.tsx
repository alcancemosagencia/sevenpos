import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../components/shell/PageHeader';
import { PageContainer } from '../components/shell/PageContainer';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { DashboardKPIs } from '../features/dashboard/DashboardKPIs';
import { DashboardSalesHistory } from '../features/dashboard/DashboardSalesHistory';
import { DashboardTopProducts } from '../features/dashboard/DashboardTopProducts';
import { DashboardQuickActions } from '../features/dashboard/DashboardQuickActions';
import { EMPTY_DASHBOARD_DATA } from '../features/dashboard/mockData';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { GetDashboardMetrics, DashboardMetricsResult } from '../application/dashboard/GetDashboardMetrics';
import { DashboardPeriod } from '../application/dashboard/periodDates';
import { salesEventBus } from '../domain/sales/events/SalesEventBus';

export interface DashboardPageProps {
  onNavigateToPos?: () => void;
  onNavigateToInventory?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToPos,
  onNavigateToInventory,
}) => {
  const businessId = 'primary-business';
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [metrics, setMetrics] = useState<DashboardMetricsResult | null>(null);

  const getDashboardMetricsUseCase = useMemo(() => {
    return new GetDashboardMetrics(
      repositoryFactory.getSaleRepository(),
      repositoryFactory.getInventoryQueryRepository()
    );
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await getDashboardMetricsUseCase.execute(businessId, period);
      setMetrics(res);
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
    }
  }, [businessId, period, getDashboardMetricsUseCase]);

  // Load on mount and on period change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMetrics();
  }, [loadMetrics]);

  // Subscribe to live sales invalidation
  useEffect(() => {
    const unsubscribe = salesEventBus.subscribe(() => {
      loadMetrics();
    });
    return unsubscribe;
  }, [loadMetrics]);

  const currentData: DashboardMetricsResult = metrics || {
    ...EMPTY_DASHBOARD_DATA,
    profitQuality: 'INCOMPLETE',
  };

  const periodOptions = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
  ];

  return (
    <PageContainer>
      {/* 1. Page Header matching Mi Pulpería */}
      <PageHeader
        title="Panel Principal"
        subtitle="Resumen del estado de tu negocio. Plan Gratis: hasta 7 días de consulta."
        actions={
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* Period selector */}
            <Select
              options={periodOptions}
              value={period}
              onChange={(val) => setPeriod(val as DashboardPeriod)}
            />

            {/* Primary Action CTA */}
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} />}
              onClick={onNavigateToPos}
              className="w-full sm:w-auto"
            >
              Nueva Venta
            </Button>
          </div>
        }
      />

      {/* 2. KPI Cards Row (4 cards) */}
      <DashboardKPIs data={currentData.kpis} />

      {/* 3. Main Two-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        {/* Left Column: Historial de Ventas (60% ~ 7 cols on lg, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <DashboardSalesHistory data={currentData.hourlySales} />
        </div>

        {/* Right Column: Productos más Vendidos (40% ~ 5 cols on lg, 4 on xl) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <DashboardTopProducts data={currentData.topProducts} />
        </div>
      </div>

      {/* 4. Bottom Quick Actions Bar */}
      <DashboardQuickActions
        onNewSale={onNavigateToPos}
        onAddInventory={onNavigateToInventory}
        onViewReports={() => {}}
      />
    </PageContainer>
  );
};
