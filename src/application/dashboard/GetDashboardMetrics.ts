import { SaleRepository } from '../../domain/sales/repositories/SaleRepository';
import { InventoryQueryRepository } from '../../domain/inventory/repositories/InventoryQueryRepository';
import { DashboardData } from '../../types/dashboard';
import { DashboardPeriod, getPeriodUtcDateRange } from './periodDates';

export interface DashboardMetricsResult extends DashboardData {
  profitQuality: 'COMPLETE' | 'INCOMPLETE';
}

export class GetDashboardMetrics {
  constructor(
    private saleRepo: SaleRepository,
    private inventoryQueryRepo: InventoryQueryRepository
  ) {}

  async execute(businessId: string, period: DashboardPeriod = 'today'): Promise<DashboardMetricsResult> {
    const { fromUtc, toUtc } = getPeriodUtcDateRange(period);

    // 1. Fetch sales summary via SQLite aggregate query
    const summary = await this.saleRepo.getSalesSummary(businessId, fromUtc, toUtc);

    // 2. Fetch inventory metrics
    const inventoryMetrics = await this.inventoryQueryRepo.getMetrics(businessId);
    const lowStockCount = inventoryMetrics.lowStockCount + inventoryMetrics.outOfStockCount;

    // 3. Fetch hourly breakdown
    const hourlyRaw = await this.saleRepo.getHourlySales(businessId, fromUtc, toUtc);

    // Format hourly intervals for the 7-bar chart view (e.g. 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00)
    const targetHours = [8, 10, 12, 14, 16, 18, 20];
    const hourlySales = targetHours.map((h) => {
      // Sum the 2-hour window [h, h+1]
      const pt1 = hourlyRaw.find((p) => p.hour === h);
      const pt2 = hourlyRaw.find((p) => p.hour === h + 1);
      const sales = (pt1?.totalSales || 0) + (pt2?.totalSales || 0);
      return {
        hour: `${String(h).padStart(2, '0')}:00`,
        sales,
        profit: 0,
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
        ? Math.round((summary.profitMinor / summary.totalSales) * 100)
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
