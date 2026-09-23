import { describe, expect, it, vi } from 'vitest';
import { Sale } from '../domain/sales/Sale';
import { SaleItem } from '../domain/sales/SaleItem';
import { aggregateSalesPeriod } from '../domain/sales/SalesPeriodAggregation';
import { businessDateYmd, businessDayStartUtc } from '../domain/common/time/BusinessCalendar';
import { resolveDateRange } from '../application/analytics/DateRangeUtils';
import { getPeriodUtcDateRange } from '../application/dashboard/periodDates';
import { formatMoney } from '../domain/common/money/Money';
import { SqliteSaleRepository } from '../infrastructure/repositories/SqliteSaleRepository';
import { InMemorySaleRepository } from '../infrastructure/repositories/InMemorySaleRepository';
import { DatabaseManager } from '../infrastructure/database/DatabaseManager';
import { RepositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { OperationalAnalyticsService } from '../application/analytics/OperationalAnalyticsService';
import { GetDashboardMetrics } from '../application/dashboard/GetDashboardMetrics';
import { InventoryQueryRepository } from '../domain/inventory/repositories/InventoryQueryRepository';

const from = '2026-09-23T00:00:00.000Z';
const to = '2026-09-25T23:59:59.999Z';

function sale(id: string, overrides: Partial<Sale> = {}): Sale {
  return {
    id, businessId: 'business-a', saleNumber: id, saleSequence: 1, status: 'COMPLETED',
    customerNameSnapshot: 'Consumidor final', subtotal: 1500, discountTotal: 0, taxTotal: 0,
    total: 1500, currencyCode: 'CLP', idempotencyKey: id, createdByUserId: 'owner',
    createdByNameSnapshot: 'Owner', createdAt: '2026-09-24T02:30:00.000Z',
    completedAt: '2026-09-24T02:30:00.000Z', ...overrides,
  };
}

function item(saleId: string, overrides: Partial<SaleItem> = {}): SaleItem {
  return {
    id: `item-${saleId}`, businessId: 'business-a', saleId, productId: 'product-1',
    productNameSnapshot: 'Producto Test Ganancia', baseUnit: 'UNIT', presentationFactor: 1,
    lineType: 'PRODUCT', saleMode: 'UNIT', quantity: 1000, inventoryQuantityDelta: -1000,
    unitPrice: 1500, discountTotal: 0, lineTotal: 1500, unitCostSnapshot: 500,
    lineCostTotal: 500, costQualitySnapshot: 'REAL', createdAt: '2026-09-24T02:30:00.000Z',
    ...overrides,
  };
}

describe('REPORTS-INCIDENT-01 canonical semantics', () => {
  it('formats integer CLP and COP without dividing by 100', () => {
    expect(formatMoney(1500, 'CLP')).toBe('$ 1.500');
    expect(formatMoney(1500, 'COP')).toBe('$ 1.500');
    expect(formatMoney(1500, 'USD')).toBe('$ 15.00');
    expect(formatMoney(1500, 'VES')).toContain('15,00');
  });

  it('counts two tickets of the same amount independently', () => {
    const summary = aggregateSalesPeriod([sale('a'), sale('b')], [item('a'), item('b')], 'business-a', from, to);
    expect(summary.totalSales).toBe(3000);
    expect(summary.ticketCount).toBe(2);
    expect(summary.knownCostTotal).toBe(1000);
    expect(summary.knownGrossProfit).toBe(2000);
    expect(summary.profitMinor).toBe(2000);
  });

  it('reads two equal tickets through the SQLite repository without SUM(DISTINCT)', async () => {
    const queries: string[] = [];
    const rows = [sale('a'), sale('b')].map((entry) => ({
      id: entry.id, business_id: entry.businessId, sale_number: entry.saleNumber,
      sale_sequence: entry.saleSequence, status: entry.status, customer_id: null,
      customer_name_snapshot: entry.customerNameSnapshot, subtotal: entry.subtotal,
      discount_total: entry.discountTotal, tax_total: entry.taxTotal, total: entry.total,
      currency_code: entry.currencyCode, note: null, idempotency_key: entry.idempotencyKey,
      created_by_user_id: entry.createdByUserId, created_by_name_snapshot: entry.createdByNameSnapshot,
      created_at: entry.createdAt, completed_at: entry.completedAt,
    }));
    const itemRows = [item('a'), item('b')].map((entry) => ({
      id: entry.id, business_id: entry.businessId, sale_id: entry.saleId,
      product_id: entry.productId, presentation_id: null,
      product_name_snapshot: entry.productNameSnapshot, presentation_name_snapshot: null,
      base_unit: entry.baseUnit, presentation_factor: entry.presentationFactor,
      line_type: entry.lineType, sale_mode: entry.saleMode, weight_grams: null,
      quantity: entry.quantity, inventory_quantity_delta: entry.inventoryQuantityDelta,
      unit_price: entry.unitPrice, discount_total: entry.discountTotal, line_total: entry.lineTotal,
      unit_cost_snapshot: entry.unitCostSnapshot, line_cost_total: entry.lineCostTotal,
      cost_quality_snapshot: entry.costQualitySnapshot, sku_snapshot: null, barcode_snapshot: null,
      created_at: entry.createdAt,
    }));
    const manager = {
      getDatabase: async () => ({ select: async (query: string) => {
        queries.push(query);
        return query.includes('FROM sale_items') ? itemRows : rows;
      } }),
    } as unknown as DatabaseManager;
    const repo = new SqliteSaleRepository(manager, new InMemorySaleRepository());
    const summary = await repo.getSalesSummary('business-a', from, to);
    expect(summary.totalSales).toBe(3000);
    expect(summary.knownGrossProfit).toBe(2000);
    expect(queries.join('\n')).not.toContain('SUM(DISTINCT');
  });

  it('uses historical snapshots for 500 cost / 1500 price and ignores later catalog changes', () => {
    const product = { costPrice: 500 };
    const line = item('a');
    product.costPrice = 900;
    const summary = aggregateSalesPeriod([sale('a')], [line], 'business-a', from, to);
    expect(summary.totalSales).toBe(1500);
    expect(summary.knownCostTotal).toBe(500);
    expect(summary.knownGrossProfit).toBe(1000);
    expect(summary.costCoveragePercent).toBe(100);
  });

  it('returns the same business sale and profit in Dashboard and Reports', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T12:00:00.000Z'));
    try {
      const repo = new InMemorySaleRepository();
      await repo.createSaleTransaction(
        sale('aligned', { createdAt: '2026-09-23T12:00:00.000Z', completedAt: '2026-09-23T12:00:00.000Z' }),
        [item('aligned')], [], [],
      );
      const inventory = { getMetrics: async () => ({
        totalProductsWithStock: 1, lowStockCount: 0, outOfStockCount: 0,
        totalMovementsToday: 0, estimatedTotalInventoryValue: 4500,
      }) } as unknown as InventoryQueryRepository;
      const factory = {
        getSaleRepository: () => repo,
        getProductRepository: () => ({ getDetailById: async () => null }),
      } as unknown as RepositoryFactory;
      const dashboard = await new GetDashboardMetrics(repo, inventory).execute('business-a', 'today', 'CL');
      const reports = await new OperationalAnalyticsService(undefined, factory)
        .getSalesAnalytics('business-a', resolveDateRange('TODAY', undefined, undefined, new Date(), 'CL'));
      expect(dashboard.kpis.todaySales).toBe(reports.summary.totalSales);
      expect(dashboard.kpis.todayProfit).toBe(reports.summary.knownGrossProfit);
      expect(dashboard.kpis.todayProfit).toBe(1000);
      expect(dashboard.kpis.todayMarginPercent).toBe(66.67);
      expect(dashboard.hourlySales.find((point) => point.hour === '08:00')).toMatchObject({ sales: 1500, profit: 1000 });
      expect(reports.summary.ticketCount).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses net line revenue after discounts', () => {
    const summary = aggregateSalesPeriod(
      [sale('a', { discountTotal: 300, total: 1200 })],
      [item('a', { discountTotal: 300, lineTotal: 1200 })], 'business-a', from, to,
    );
    expect(summary.totalSales).toBe(1200);
    expect(summary.knownGrossProfit).toBe(700);
  });

  it('does not silently treat NULL or OPEN_AMOUNT cost as zero', () => {
    const summary = aggregateSalesPeriod(
      [sale('a'), sale('b', { total: 5000, subtotal: 5000 })],
      [item('a'), item('b', { lineType: 'OPEN_AMOUNT', productId: null, inventoryQuantityDelta: 0,
        unitPrice: 5000, lineTotal: 5000, unitCostSnapshot: null, lineCostTotal: null,
        costQualitySnapshot: 'UNKNOWN' })], 'business-a', from, to,
    );
    expect(summary.totalSales).toBe(6500);
    expect(summary.knownGrossProfit).toBe(1000);
    expect(summary.profitMinor).toBeNull();
    expect(summary.costCoveragePercent).toBe(50);
  });

  it('excludes voided and other-business sales', () => {
    const summary = aggregateSalesPeriod(
      [sale('a'), sale('voided', { status: 'VOIDED' }),
        sale('cancelled', { status: 'CANCELLED' as Sale['status'] }),
        sale('other', { businessId: 'business-b' })],
      [item('a'), item('voided'), item('cancelled'), item('other', { businessId: 'business-b' })], 'business-a', from, to,
    );
    expect(summary.totalSales).toBe(1500);
    expect(summary.ticketCount).toBe(1);
  });

  it.each([['CL', 'America/Santiago'], ['CO', 'America/Bogota'], ['VE', 'America/Caracas']])(
    'aligns Dashboard and Reports at 23:30 business time for %s', (country) => {
      const ymd = '2026-09-23';
      const instant = new Date(Date.parse(businessDayStartUtc('2026-09-24', country)) - 30 * 60 * 1000);
      expect(businessDateYmd(instant, country)).toBe(ymd);
      const report = resolveDateRange('TODAY', undefined, undefined, instant, country);
      const dashboard = getPeriodUtcDateRange('today', instant, country);
      expect(report.fromUtc).toBe(dashboard.fromUtc);
      expect(report.toUtc).toBe(dashboard.toUtc);
      expect(instant.toISOString() >= report.fromUtc && instant.toISOString() <= report.toUtc).toBe(true);
    },
  );
});
