import { SaleRepository } from '../../domain/sales/repositories/SaleRepository';
import { InventoryQueryRepository } from '../../domain/inventory/repositories/InventoryQueryRepository';
import { DashboardData } from '../../types/dashboard';
import { DashboardPeriod, getPeriodUtcDateRange } from './periodDates';
import { getTimezoneForCountry } from '../subscription/TimezoneUtils';
import { aggregateSalesPeriod } from '../../domain/sales/SalesPeriodAggregation';

export interface DashboardMetricsResult extends DashboardData {
  profitQuality: 'COMPLETE' | 'INCOMPLETE';
}

export class GetDashboardMetrics {
  constructor(
    private saleRepo: SaleRepository,
    private inventoryQueryRepo: InventoryQueryRepository
  ) {}

  async execute(businessId: string, period: DashboardPeriod = 'today', countryCode = 'CL'): Promise<DashboardMetricsResult> {
    const { fromUtc, toUtc } = getPeriodUtcDateRange(period, new Date(), countryCode);

    // 1. Fetch sales summary via SQLite aggregate query
    const summary = await this.saleRepo.getSalesSummary(businessId, fromUtc, toUtc);

    // 2. Fetch inventory metrics
    const inventoryMetrics = await this.inventoryQueryRepo.getMetrics(businessId);
    const lowStockCount = inventoryMetrics.lowStockCount + inventoryMetrics.outOfStockCount;

    // Use the same persisted sale/item snapshots as the period summary.
    const periodSales = (await this.saleRepo.listSales(businessId)).filter((sale) =>
      sale.status === 'COMPLETED' && sale.completedAt >= fromUtc && sale.completedAt <= toUtc,
    );
    const saleDetails = await Promise.all(periodSales.map((sale) => this.saleRepo.getSaleById(sale.id)));
    const hourlyFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: getTimezoneForCountry(countryCode), hour: '2-digit', hourCycle: 'h23',
    });
    const targetHours = [8, 10, 12, 14, 16, 18, 20];
    const hourlySales = targetHours.map((h) => {
      const selected = periodSales.filter((sale) => {
        const localHour = Number(hourlyFormatter.format(new Date(sale.completedAt)));
        return localHour === h || localHour === h + 1;
      });
      const selectedIds = new Set(selected.map((sale) => sale.id));
      const items = saleDetails.flatMap((details) => details?.items ?? []).filter((item) => selectedIds.has(item.saleId));
      const aggregate = aggregateSalesPeriod(selected, items, businessId, fromUtc, toUtc);
      return {
        hour: `${String(h).padStart(2, '0')}:00`,
        sales: aggregate.totalSales,
        profit: selected.length === 0 ? 0 : aggregate.profitMinor,
      };
    });

    // 4. Fetch top selling products
    const topRaw = await this.saleRepo.getTopSellingProducts(businessId, fromUtc, toUtc, 5);
    const topProducts = topRaw.map((t) => ({
      id: t.productId,
      name: t.productName,
      category: 'General',
      unitsSold: Math.round(t.totalQuantityMajor * 10) / 10,
      totalRevenue: t.totalRevenue,
    }));

    const marginPercent =
      summary.totalSales > 0 && summary.profitMinor != null
        ? Math.round((summary.profitMinor / summary.totalSales) * 10_000) / 100
        : 0;

    return {
      profitQuality: summary.profitQuality,
      kpis: {
        todaySales: summary.totalSales,
        todayTicketsCount: summary.ticketCount,
        todayProfit: summary.profitMinor != null ? summary.profitMinor : 0,
        todayMarginPercent: marginPercent,
        lowStockCount,
        pendingCredits: 0,
        activeCreditsCount: 0,
      },
      hourlySales,
      topProducts,
    };
  }
}
