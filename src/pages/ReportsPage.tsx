import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '../components/shell/PageContainer';
import { DateRange, ExecutiveSummaryMetrics, SalesAnalyticsView, InventoryAnalyticsView, FinancialAnalyticsView, CustomerAnalyticsView } from '../application/analytics/types';
import { resolveDateRange } from '../application/analytics/DateRangeUtils';
import { operationalAnalyticsService } from '../application/analytics/OperationalAnalyticsService';
import { AnalyticsKpiCard } from '../components/analytics/AnalyticsKpiCard';
import { SimpleBarChart } from '../components/analytics/SimpleBarChart';
import { SimpleAreaChart } from '../components/analytics/SimpleAreaChart';
import { DistributionBar } from '../components/analytics/DistributionBar';
import { DateRangePickerDropdown } from '../components/analytics/DateRangePickerDropdown';
import { ExportCsvModal } from '../components/analytics/ExportCsvModal';
import { ReportsTabs, ReportTabKey } from '../components/analytics/ReportsTabs';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  ShoppingBag,
  Package,
  AlertTriangle,
  Users,
  Download,
  RefreshCw,
  Scale,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { Card } from '../components/ui/Card';

export const ReportsPage: React.FC = () => {
  const businessId = 'primary-business';

  // Date Range state (default: THIS_MONTH)
  const [dateRange, setDateRange] = useState<DateRange>(() => resolveDateRange('THIS_MONTH'));
  const [activeTab, setActiveTab] = useState<ReportTabKey>('resumen');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Analytics Views State
  const [summaryData, setSummaryData] = useState<ExecutiveSummaryMetrics | null>(null);
  const [salesData, setSalesData] = useState<SalesAnalyticsView | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryAnalyticsView | null>(null);
  const [financialData, setFinancialData] = useState<FinancialAnalyticsView | null>(null);
  const [customerData, setCustomerData] = useState<CustomerAnalyticsView | null>(null);

  const formatMoney = useCallback((minor: number): string => {
    return `$ ${(minor / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sum, sls, inv, fin, cust] = await Promise.all([
        operationalAnalyticsService.getExecutiveSummary(businessId, dateRange),
        operationalAnalyticsService.getSalesAnalytics(businessId, dateRange),
        operationalAnalyticsService.getInventoryAnalytics(businessId, dateRange),
        operationalAnalyticsService.getFinancialAnalytics(businessId, dateRange),
        operationalAnalyticsService.getCustomerAnalytics(businessId, dateRange),
      ]);

      setSummaryData(sum);
      setSalesData(sls);
      setInventoryData(inv);
      setFinancialData(fin);
      setCustomerData(cust);
    } catch (err) {
      console.error('Error loading operational reports data:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, dateRange]);

  useEffect(() => {
    let isCancelled = false;
    Promise.all([
      operationalAnalyticsService.getExecutiveSummary(businessId, dateRange),
      operationalAnalyticsService.getSalesAnalytics(businessId, dateRange),
      operationalAnalyticsService.getInventoryAnalytics(businessId, dateRange),
      operationalAnalyticsService.getFinancialAnalytics(businessId, dateRange),
      operationalAnalyticsService.getCustomerAnalytics(businessId, dateRange),
    ])
      .then(([sum, sls, inv, fin, cust]) => {
        if (!isCancelled) {
          setSummaryData(sum);
          setSalesData(sls);
          setInventoryData(inv);
          setFinancialData(fin);
          setCustomerData(cust);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Error loading operational reports data:', err);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [businessId, dateRange]);

  return (
    <PageContainer>
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-divider">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reportes e Inteligencia
          </h1>
          <p className="text-sm text-content4 mt-0.5">
            Analiza el rendimiento de tu negocio y toma mejores decisiones.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <DateRangePickerDropdown
            currentRange={dateRange}
            onRangeChange={(newRange) => setDateRange(newRange)}
          />

          <button
            type="button"
            data-testid="export-csv-btn"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border-default hover:border-border-strong text-sm font-medium text-foreground transition-all shadow-xs"
            title="Exportar reporte a CSV"
          >
            <Download size={15} className="text-content3" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            type="button"
            data-testid="refresh-btn"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-surface border border-border-default hover:border-border-strong text-content3 hover:text-foreground transition-all shadow-xs"
            title="Recargar datos"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* HeroUI v3.2.4 Native Navigation Tabs */}
      <div className="pt-3 pb-1">
        <ReportsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content Area */}
      {loading && !summaryData ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-content4">
          <RefreshCw size={28} className="animate-spin text-primary" />
          <p className="text-sm">Cargando métricas del sistema local...</p>
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {/* ================================================================= */}
          {/* TAB 1: RESUMEN EJECUTIVO */}
          {/* ================================================================= */}
          {activeTab === 'resumen' && summaryData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Executive KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalyticsKpiCard
                  title="Ventas Netas"
                  value={formatMoney(summaryData.totalSales.current)}
                  delta={summaryData.totalSales}
                  comparisonLabel="vs período anterior"
                  icon={<DollarSign size={18} />}
                  highlight
                />

                <AnalyticsKpiCard
                  title="Ganancia Bruta Conocida"
                  value={formatMoney(summaryData.knownGrossProfit)}
                  subtitle={`Cobertura de costo: ${summaryData.costCoveragePercent}%`}
                  tooltip="Calculada sobre líneas con snapshot de costo unitario real verificado."
                  icon={<TrendingUp size={18} />}
                  badge={{
                    text:
                      summaryData.costQuality === 'COMPLETE'
                        ? '100% Costeado'
                        : summaryData.costQuality === 'PARTIAL'
                        ? `${summaryData.costCoveragePercent}% Cobertura`
                        : 'Sin Costo',
                    variant:
                      summaryData.costQuality === 'COMPLETE'
                        ? 'success'
                        : summaryData.costQuality === 'PARTIAL'
                        ? 'warning'
                        : 'neutral',
                  }}
                />

                <AnalyticsKpiCard
                  title="Gastos Operativos"
                  value={formatMoney(summaryData.operatingExpenses.current)}
                  delta={summaryData.operatingExpenses}
                  comparisonLabel="vs anterior"
                  icon={<Receipt size={18} />}
                />

                {/* Operating Result with STRICT 100% Coverage Rule */}
                {summaryData.canShowGlobalOperatingResult ? (
                  <AnalyticsKpiCard
                    title="Resultado Operativo"
                    value={formatMoney(summaryData.estimatedOperatingResult || 0)}
                    subtitle="Ganancia bruta menos gastos operativos"
                    icon={<Scale size={18} />}
                    badge={{ text: 'Exacto', variant: 'success' }}
                  />
                ) : (
                  <AnalyticsKpiCard
                    title="Resultado Parcial Conocido"
                    value={formatMoney(summaryData.knownOperatingResult)}
                    subtitle={`Exclusivo para la porción costeada (${summaryData.costCoveragePercent}%)`}
                    tooltip="El resultado global no se proyecta para preservar exactitud contable estricta."
                    icon={<HelpCircle size={18} />}
                    badge={{ text: 'Cobertura Parcial', variant: 'warning' }}
                  />
                )}
              </div>

              {/* Secondary Operational KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] font-medium text-content4 uppercase">Tickets Emitidos</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-foreground">{summaryData.ticketCount.current}</span>
                    <span className="text-xs text-content3">Ticket Prom: {formatMoney(summaryData.averageTicket.current)}</span>
                  </div>
                </Card>

                <Card className="p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] font-medium text-content4 uppercase">Compras Recibidas</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-foreground">{formatMoney(summaryData.receivedPurchasesTotal)}</span>
                    <span className="text-xs text-content3">{summaryData.openOrdersCount} ord. abiertas</span>
                  </div>
                </Card>

                <Card className="p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] font-medium text-content4 uppercase">Varianza de Caja Abs.</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className={`text-xl font-bold ${summaryData.cashAbsoluteVariance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {formatMoney(summaryData.cashAbsoluteVariance)}
                    </span>
                    <span className="text-xs text-content3">{summaryData.cashSessionsWithDifferenceCount} turnos c/dif</span>
                  </div>
                </Card>

                <Card className="p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] font-medium text-content4 uppercase">Valor en Inventario</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-foreground">{formatMoney(summaryData.totalInventoryValue)}</span>
                    <span className="text-xs text-content3">{summaryData.lowStockCount} bajo stock</span>
                  </div>
                </Card>
              </div>

              {/* Charts Row: Trend & Hourly */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-5 lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Tendencia de Ventas Diarias</h3>
                      <p className="text-xs text-content4">Ingresos netos por día en el período seleccionado</p>
                    </div>
                  </div>
                  {salesData && (
                    <SimpleAreaChart
                      data={salesData.timeSeries}
                      valueFormatter={(v) => formatMoney(v)}
                    />
                  )}
                </Card>

                <Card className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Distribución Horaria</h3>
                    <p className="text-xs text-content4">Horas pico de facturación (00:00 a 23:00)</p>
                  </div>
                  {salesData && (
                    <SimpleBarChart
                      data={salesData.hourlyDistribution.map((h) => ({
                        label: h.label,
                        value: h.totalSales,
                        tooltipText: `${h.ticketCount} tickets`,
                      }))}
                      valueFormatter={(v) => formatMoney(v)}
                    />
                  )}
                </Card>
              </div>

              {/* Bottom Row: Top 5 Products & Payment Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Top 5 Productos Más Vendidos</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ventas')}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      Ver todos <ArrowRight size={13} />
                    </button>
                  </div>

                  {salesData && salesData.topProducts.length > 0 ? (
                    <div className="space-y-2.5">
                      {salesData.topProducts.slice(0, 5).map((p, idx) => (
                        <div key={p.productId} className="flex items-center justify-between p-2.5 rounded-xl bg-content4/5 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <div className="font-semibold text-foreground truncate">{p.productName}</div>
                              <div className="text-[11px] text-content4">
                                {p.quantitySold.toFixed(2)} {p.baseUnit} • {p.ticketCount} tickets
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-foreground">{formatMoney(p.totalRevenue)}</div>
                            <div className="text-[11px] text-primary">{p.revenuePercentOfTotal}% del total</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-content4 italic py-6 text-center">Sin ventas registradas en el período.</div>
                  )}
                </Card>

                <Card className="p-5 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Métodos de Pago</h3>
                  {salesData && salesData.paymentBreakdown.length > 0 ? (
                    <DistributionBar
                      segments={salesData.paymentBreakdown.map((pm) => ({
                        key: pm.code,
                        label: pm.name,
                        value: pm.totalAmount,
                        percentage: pm.percentage,
                      }))}
                      valueFormatter={(v) => formatMoney(v)}
                    />
                  ) : (
                    <div className="text-xs text-content4 italic py-6 text-center">Sin transacciones registradas.</div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: VENTAS (SALES DEEP DIVE) */}
          {/* ================================================================= */}
          {activeTab === 'ventas' && salesData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Sales KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <AnalyticsKpiCard
                  title="Ventas Totales"
                  value={formatMoney(salesData.summary.totalSales)}
                  subtitle={`${salesData.summary.ticketCount} tickets completados`}
                  icon={<DollarSign size={18} />}
                />

                <AnalyticsKpiCard
                  title="Ticket Promedio"
                  value={formatMoney(salesData.summary.averageTicket)}
                  subtitle="Ingreso por transacción"
                  icon={<ShoppingBag size={18} />}
                />

                <AnalyticsKpiCard
                  title="Descuentos Totales"
                  value={formatMoney(salesData.summary.totalDiscount)}
                  subtitle="Descuentos otorgados"
                  icon={<Percent size={18} />}
                />

                <AnalyticsKpiCard
                  title="Ganancia Bruta Conocida"
                  value={formatMoney(salesData.summary.knownGrossProfit)}
                  subtitle={`Cobertura: ${salesData.summary.costCoveragePercent}%`}
                  icon={<TrendingUp size={18} />}
                  badge={{
                    text: `${salesData.summary.linesWithCostCount}/${salesData.summary.totalLinesCount} Líneas`,
                    variant: salesData.summary.costCoveragePercent === 100 ? 'success' : 'warning',
                  }}
                />
              </div>

              {/* Time Series & Category Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-5 lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Evolución de Ventas Diarias</h3>
                  <SimpleAreaChart data={salesData.timeSeries} valueFormatter={(v) => formatMoney(v)} />
                </Card>

                <Card className="p-5 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Ventas por Categoría</h3>
                  {salesData.categoryBreakdown.length > 0 ? (
                    <DistributionBar
                      segments={salesData.categoryBreakdown.map((c) => ({
                        key: c.categoryId,
                        label: c.categoryName,
                        value: c.totalRevenue,
                        percentage: c.percentage,
                        color: c.color,
                      }))}
                      valueFormatter={(v) => formatMoney(v)}
                    />
                  ) : (
                    <div className="text-xs text-content4 italic py-6 text-center">Sin categorías registradas en ventas.</div>
                  )}
                </Card>
              </div>

              {/* Top Products Detailed Table */}
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground">Ranking de Productos Vendidos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-divider text-content4 font-semibold">
                        <th className="pb-2.5">Producto</th>
                        <th className="pb-2.5">Categoría</th>
                        <th className="pb-2.5 text-right">Cant. Vendida</th>
                        <th className="pb-2.5 text-right">Ingresos</th>
                        <th className="pb-2.5 text-right">% Ventas</th>
                        <th className="pb-2.5 text-right">Tickets</th>
                        <th className="pb-2.5 text-right">Ganancia Conocida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/50">
                      {salesData.topProducts.map((p) => (
                        <tr key={p.productId} className="hover:bg-content4/5">
                          <td className="py-2.5 font-semibold text-foreground">{p.productName}</td>
                          <td className="py-2.5 text-content3">{p.categoryName}</td>
                          <td className="py-2.5 text-right font-medium">{p.quantitySold.toFixed(2)} {p.baseUnit}</td>
                          <td className="py-2.5 text-right font-bold text-foreground">{formatMoney(p.totalRevenue)}</td>
                          <td className="py-2.5 text-right font-medium text-primary">{p.revenuePercentOfTotal}%</td>
                          <td className="py-2.5 text-right text-content3">{p.ticketCount}</td>
                          <td className="py-2.5 text-right font-semibold text-emerald-500">
                            {p.grossProfit !== null ? formatMoney(p.grossProfit) : <span className="text-content4 italic text-[11px]">Sin costo</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Recent Sales List */}
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground">Últimas Ventas Completadas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-divider text-content4 font-semibold">
                        <th className="pb-2.5">N° Venta</th>
                        <th className="pb-2.5">Fecha</th>
                        <th className="pb-2.5">Cliente</th>
                        <th className="pb-2.5 text-right">Items</th>
                        <th className="pb-2.5 text-right">Subtotal</th>
                        <th className="pb-2.5 text-right">Descuento</th>
                        <th className="pb-2.5 text-right">Total</th>
                        <th className="pb-2.5">Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/50">
                      {salesData.recentSales.map((s) => (
                        <tr key={s.id} className="hover:bg-content4/5">
                          <td className="py-2.5 font-mono font-bold text-primary">{s.saleNumber}</td>
                          <td className="py-2.5 text-content3">{new Date(s.completedAt).toLocaleString()}</td>
                          <td className="py-2.5 text-foreground">{s.customerName}</td>
                          <td className="py-2.5 text-right text-content3">{s.itemCount}</td>
                          <td className="py-2.5 text-right text-content3">{formatMoney(s.subtotal)}</td>
                          <td className="py-2.5 text-right text-content4">{formatMoney(s.discountTotal)}</td>
                          <td className="py-2.5 text-right font-bold text-foreground">{formatMoney(s.total)}</td>
                          <td className="py-2.5 text-content2">{s.paymentMethods}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: INVENTARIO (INVENTORY INTELLIGENCE) */}
          {/* ================================================================= */}
          {activeTab === 'inventario' && inventoryData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Inventory KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <AnalyticsKpiCard
                  title="Valor Total Inventario"
                  value={formatMoney(inventoryData.kpis.estimatedInventoryValue)}
                  subtitle={`${inventoryData.kpis.productsWithStock} prod. con stock`}
                  icon={<Package size={18} />}
                />

                <AnalyticsKpiCard
                  title="Bajo Stock"
                  value={inventoryData.kpis.lowStockCount.toString()}
                  subtitle="Requiere reposición"
                  icon={<AlertTriangle size={18} />}
                  badge={{
                    text: inventoryData.kpis.lowStockCount > 0 ? 'Alerta' : 'Óptimo',
                    variant: inventoryData.kpis.lowStockCount > 0 ? 'warning' : 'success',
                  }}
                />

                <AnalyticsKpiCard
                  title="Productos Agotados"
                  value={inventoryData.kpis.outOfStockCount.toString()}
                  subtitle="Sin stock disponible"
                  icon={<AlertCircle size={18} />}
                  badge={{
                    text: inventoryData.kpis.outOfStockCount > 0 ? 'Crítico' : 'Cero',
                    variant: inventoryData.kpis.outOfStockCount > 0 ? 'danger' : 'success',
                  }}
                />

                <AnalyticsKpiCard
                  title="Compras Recibidas"
                  value={formatMoney(inventoryData.kpis.receivedPurchasesPeriod)}
                  subtitle={`${inventoryData.kpis.openOrdersCount} órdenes abiertas`}
                  icon={<ShoppingBag size={18} />}
                />
              </div>

              {/* Category Valuation Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-5 lg:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Valor por Categoría</h3>
                  <DistributionBar
                    segments={inventoryData.inventoryByCategory.map((c) => ({
                      key: c.categoryName,
                      label: c.categoryName,
                      value: c.stockValue,
                      percentage: c.percentage,
                    }))}
                    valueFormatter={(v) => formatMoney(v)}
                  />
                </Card>

                {/* Low Stock Priority Table */}
                <Card className="p-5 lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Productos con Bajo Stock / Reposición</h3>
                    <span className="text-xs text-amber-500 font-semibold">{inventoryData.lowStockItems.length} productos</span>
                  </div>

                  {inventoryData.lowStockItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-divider text-content4 font-semibold">
                            <th className="pb-2.5">Producto</th>
                            <th className="pb-2.5">Categoría</th>
                            <th className="pb-2.5 text-right">Stock Actual</th>
                            <th className="pb-2.5 text-right">Mínimo</th>
                            <th className="pb-2.5 text-right">Déficit</th>
                            <th className="pb-2.5 text-right">Costo Estimado Reposición</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-divider/50">
                          {inventoryData.lowStockItems.map((item) => (
                            <tr key={item.productId} className="hover:bg-content4/5">
                              <td className="py-2.5 font-semibold text-foreground">{item.productName}</td>
                              <td className="py-2.5 text-content3">{item.categoryName}</td>
                              <td className="py-2.5 text-right font-bold text-rose-500">{item.currentStock.toFixed(2)}</td>
                              <td className="py-2.5 text-right text-content3">{item.minimumStock.toFixed(2)}</td>
                              <td className="py-2.5 text-right font-semibold text-amber-500">+{item.deficit.toFixed(2)}</td>
                              <td className="py-2.5 text-right font-medium text-foreground">
                                {item.estimatedDeficitCost !== null ? formatMoney(item.estimatedDeficitCost) : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-content4 italic py-8 text-center flex flex-col items-center gap-2">
                      <CheckCircle size={22} className="text-emerald-500" />
                      Todos los productos se encuentran por encima de su nivel mínimo de stock.
                    </div>
                  )}
                </Card>
              </div>

              {/* Received Goods Receipts in Period */}
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground">Recepciones de Mercadería en el Período</h3>
                {inventoryData.receivedReceipts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-divider text-content4 font-semibold">
                          <th className="pb-2.5">Comprobante Recepción</th>
                          <th className="pb-2.5">Fecha</th>
                          <th className="pb-2.5">Orden Origen</th>
                          <th className="pb-2.5">Proveedor</th>
                          <th className="pb-2.5 text-right">Items Recibidos</th>
                          <th className="pb-2.5 text-right">Costo Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider/50">
                        {inventoryData.receivedReceipts.map((r) => (
                          <tr key={r.receiptId} className="hover:bg-content4/5">
                            <td className="py-2.5 font-mono font-bold text-primary">{r.receiptNumber}</td>
                            <td className="py-2.5 text-content3">{new Date(r.receivedAt).toLocaleString()}</td>
                            <td className="py-2.5 font-mono text-content2">{r.orderNumber}</td>
                            <td className="py-2.5 text-foreground">{r.supplierName}</td>
                            <td className="py-2.5 text-right font-medium text-content3">{r.itemCount}</td>
                            <td className="py-2.5 text-right font-bold text-foreground">{formatMoney(r.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-content4 italic py-6 text-center">No hubo recepciones de mercadería en este período.</div>
                )}
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: FINANZAS Y AUDITORÍA DE CAJA */}
          {/* ================================================================= */}
          {activeTab === 'finanzas' && financialData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Financial Statement P&L Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalyticsKpiCard
                  title="Ventas Netas"
                  value={formatMoney(financialData.pnl.netSales)}
                  icon={<DollarSign size={18} />}
                />

                <AnalyticsKpiCard
                  title="Costo de Ventas (Conocido)"
                  value={formatMoney(financialData.pnl.knownCostOfGoodsSold)}
                  subtitle={`Cobertura: ${financialData.pnl.costCoveragePercent}%`}
                  icon={<TrendingUp size={18} />}
                />

                <AnalyticsKpiCard
                  title="Gastos Operativos"
                  value={formatMoney(financialData.pnl.operatingExpensesTotal)}
                  icon={<Receipt size={18} />}
                />

                {/* Operating Result Strict Rule Display */}
                {financialData.pnl.canShowOperatingResult ? (
                  <AnalyticsKpiCard
                    title="Resultado Operativo Global"
                    value={formatMoney(financialData.pnl.estimatedOperatingResult || 0)}
                    subtitle="Ganancia bruta menos gastos operativos"
                    icon={<Scale size={18} />}
                    badge={{ text: 'Exacto 100%', variant: 'success' }}
                    highlight
                  />
                ) : (
                  <AnalyticsKpiCard
                    title="Resultado Operativo Conocido"
                    value={formatMoney(financialData.pnl.knownOperatingResult)}
                    subtitle={`Para porción con costo conocido (${financialData.pnl.costCoveragePercent}%)`}
                    icon={<HelpCircle size={18} />}
                    badge={{ text: 'Cobertura Parcial', variant: 'warning' }}
                  />
                )}
              </div>

              {/* Expenses Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Gastos por Categoría</h3>
                  {financialData.expensesByCategory.length > 0 ? (
                    <DistributionBar
                      segments={financialData.expensesByCategory.map((e) => ({
                        key: e.categoryId,
                        label: e.categoryName,
                        value: e.totalAmount,
                        percentage: e.percentage,
                      }))}
                      valueFormatter={(v) => formatMoney(v)}
                    />
                  ) : (
                    <div className="text-xs text-content4 italic py-6 text-center">Sin gastos operativos registrados en el período.</div>
                  )}
                </Card>

                <Card className="p-5 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Gastos por Método de Pago</h3>
                  {financialData.expensesByPaymentMethod.length > 0 ? (
                    <DistributionBar
                      segments={financialData.expensesByPaymentMethod.map((e) => ({
                        key: e.methodCode,
                        label: e.methodCode,
                        value: e.totalAmount,
                        percentage: e.percentage,
                      }))}
                      valueFormatter={(v) => formatMoney(v)}
                    />
                  ) : (
                    <div className="text-xs text-content4 italic py-6 text-center">Sin gastos registrados.</div>
                  )}
                </Card>
              </div>

              {/* Cash Sessions Discrepancies Audit */}
              <Card className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Auditoría de Turnos de Caja (Arqueos)</h3>
                    <p className="text-xs text-content4">
                      Comparativa entre saldo esperado del sistema y conteo físico declarado por el cajero.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="px-3 py-1.5 rounded-xl bg-content4/5 border border-divider">
                      <span className="text-content4">Diferencia Neta: </span>
                      <span className={`font-bold ${financialData.cashAudit.netCashDifference < 0 ? 'text-rose-500' : 'text-foreground'}`}>
                        {formatMoney(financialData.cashAudit.netCashDifference)}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-content4/5 border border-divider">
                      <span className="text-content4">Varianza Absoluta: </span>
                      <span className={`font-bold ${financialData.cashAudit.absoluteCashVariance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {formatMoney(financialData.cashAudit.absoluteCashVariance)}
                      </span>
                    </div>
                  </div>
                </div>

                {financialData.cashAudit.sessions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-divider text-content4 font-semibold">
                          <th className="pb-2.5">Caja</th>
                          <th className="pb-2.5">Apertura Por</th>
                          <th className="pb-2.5">Fecha Apertura</th>
                          <th className="pb-2.5">Fecha Cierre</th>
                          <th className="pb-2.5 text-right">Inicial</th>
                          <th className="pb-2.5 text-right">Esperado</th>
                          <th className="pb-2.5 text-right">Contado</th>
                          <th className="pb-2.5 text-right">Diferencia</th>
                          <th className="pb-2.5 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider/50">
                        {financialData.cashAudit.sessions.map((s) => (
                          <tr key={s.sessionId} className="hover:bg-content4/5">
                            <td className="py-2.5 font-semibold text-foreground">{s.registerName}</td>
                            <td className="py-2.5 text-content2">{s.openedByName}</td>
                            <td className="py-2.5 text-content4">{new Date(s.openedAt).toLocaleString()}</td>
                            <td className="py-2.5 text-content4">{s.closedAt ? new Date(s.closedAt).toLocaleString() : 'Abierto'}</td>
                            <td className="py-2.5 text-right text-content3">{formatMoney(s.initialCashAmount)}</td>
                            <td className="py-2.5 text-right font-medium text-foreground">{formatMoney(s.expectedCashAmount)}</td>
                            <td className="py-2.5 text-right font-medium text-foreground">
                              {s.countedCashAmount !== null ? formatMoney(s.countedCashAmount) : 'N/A'}
                            </td>
                            <td className="py-2.5 text-right font-bold">
                              {s.differenceAmount === 0 ? (
                                <span className="text-emerald-500">$ 0.00</span>
                              ) : s.differenceAmount > 0 ? (
                                <span className="text-emerald-500">+{formatMoney(s.differenceAmount)}</span>
                              ) : (
                                <span className="text-rose-500">{formatMoney(s.differenceAmount)}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  s.status === 'CLOSED'
                                    ? 'bg-content4/20 text-content2'
                                    : 'bg-emerald-500/10 text-emerald-500'
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-content4 italic py-6 text-center">Sin turnos de caja registrados en el período.</div>
                )}
              </Card>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: CLIENTES (CUSTOMER INSIGHTS) */}
          {/* ================================================================= */}
          {activeTab === 'clientes' && customerData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Customer KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <AnalyticsKpiCard
                  title="Clientes Registrados"
                  value={customerData.kpis.totalCustomers.toString()}
                  subtitle={`${customerData.kpis.activeCustomersInPeriod} activos en período`}
                  icon={<Users size={18} />}
                />

                <AnalyticsKpiCard
                  title="Tasa de Identificación"
                  value={`${customerData.kpis.customerIdentificationRate}%`}
                  subtitle="Ventas asociadas a cliente"
                  icon={<ShieldCheck size={18} />}
                  badge={{
                    text: customerData.kpis.customerIdentificationRate > 50 ? 'Alta Fidelidad' : 'Estándar',
                    variant: customerData.kpis.customerIdentificationRate > 50 ? 'success' : 'neutral',
                  }}
                />

                <AnalyticsKpiCard
                  title="Ventas Identificadas"
                  value={formatMoney(customerData.salesSplit.identifiedRevenue)}
                  subtitle={`${customerData.salesSplit.identifiedTickets} tickets con cliente`}
                  icon={<DollarSign size={18} />}
                />

                <AnalyticsKpiCard
                  title="Cliente Más Valioso"
                  value={customerData.kpis.topCustomerName || 'N/A'}
                  subtitle={customerData.kpis.topCustomerSpend > 0 ? formatMoney(customerData.kpis.topCustomerSpend) : 'Sin compras'}
                  icon={<TrendingUp size={18} />}
                />
              </div>

              {/* Identified vs Anonymous Sales Split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-5 lg:col-span-1 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Identificación en Ventas</h3>
                  <DistributionBar
                    segments={[
                      {
                        key: 'identified',
                        label: 'Cliente Identificado',
                        value: customerData.salesSplit.identifiedRevenue,
                        percentage: customerData.kpis.customerIdentificationRate,
                        color: '#6366f1',
                      },
                      {
                        key: 'anonymous',
                        label: 'Venta Anónima / Mostrador',
                        value: customerData.salesSplit.anonymousRevenue,
                        percentage: Number((100 - customerData.kpis.customerIdentificationRate).toFixed(1)),
                        color: '#94a3b8',
                      },
                    ]}
                    valueFormatter={(v) => formatMoney(v)}
                  />
                </Card>

                {/* Top Customers in Period Table */}
                <Card className="p-5 lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Top Clientes por Facturación en el Período</h3>
                  {customerData.topCustomers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-divider text-content4 font-semibold">
                            <th className="pb-2.5">Cliente</th>
                            <th className="pb-2.5">Contacto</th>
                            <th className="pb-2.5 text-right">Tickets</th>
                            <th className="pb-2.5 text-right">Ticket Promedio</th>
                            <th className="pb-2.5 text-right">Total Facturado</th>
                            <th className="pb-2.5 text-right">Última Compra</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-divider/50">
                          {customerData.topCustomers.map((c) => (
                            <tr key={c.customerId} className="hover:bg-content4/5">
                              <td className="py-2.5 font-semibold text-foreground">{c.name}</td>
                              <td className="py-2.5 text-content3">{c.phone || c.email || 'N/A'}</td>
                              <td className="py-2.5 text-right text-content2 font-medium">{c.ticketCountInPeriod}</td>
                              <td className="py-2.5 text-right text-content3">{formatMoney(c.averageTicket)}</td>
                              <td className="py-2.5 text-right font-bold text-foreground">{formatMoney(c.totalSpentInPeriod)}</td>
                              <td className="py-2.5 text-right text-content4">
                                {c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-content4 italic py-6 text-center">
                      No hay compras vinculadas a clientes registrados en el período.
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Export Modal */}
      <ExportCsvModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        businessId={businessId}
        currentRange={dateRange}
      />
    </PageContainer>
  );
};
