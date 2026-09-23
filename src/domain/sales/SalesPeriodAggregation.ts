import { Sale } from './Sale';
import { SaleItem } from './SaleItem';
import { SalesPeriodSummary } from './repositories/SaleRepository';

/** Aggregates persisted sale and cost snapshots; catalog prices are never consulted. */
export function aggregateSalesPeriod(sales: Sale[], items: SaleItem[], businessId: string, fromUtc: string, toUtc: string): SalesPeriodSummary {
  const completed = sales.filter((sale) =>
    sale.businessId === businessId && sale.status === 'COMPLETED' &&
    sale.completedAt >= fromUtc && sale.completedAt <= toUtc,
  );
  const saleIds = new Set(completed.map((sale) => sale.id));
  const periodItems = items.filter((item) => item.businessId === businessId && saleIds.has(item.saleId));
  const knownItems = periodItems.filter((item) =>
    item.costQualitySnapshot === 'REAL' && item.unitCostSnapshot != null && item.lineCostTotal != null,
  );
  const totalSales = completed.reduce((total, sale) => total + sale.total, 0);
  const totalDiscount = completed.reduce((total, sale) => total + sale.discountTotal, 0);
  const knownCostTotal = knownItems.reduce((total, item) => total + item.lineCostTotal!, 0);
  const knownGrossProfit = knownItems.reduce((total, item) => total + item.lineTotal - item.lineCostTotal!, 0);
  const costCoveragePercent = periodItems.length > 0
    ? Number(((knownItems.length / periodItems.length) * 100).toFixed(1))
    : 0;
  const profitQuality = periodItems.length > 0 && knownItems.length === periodItems.length ? 'COMPLETE' : 'INCOMPLETE';
  return {
    totalSales,
    ticketCount: completed.length,
    totalDiscount,
    profitMinor: profitQuality === 'COMPLETE' ? knownGrossProfit : null,
    profitQuality,
    knownCostTotal,
    knownGrossProfit,
    costCoveragePercent,
    linesWithCostCount: knownItems.length,
    totalLinesCount: periodItems.length,
  };
}
