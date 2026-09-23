import { DatabaseManager, databaseManager } from '../../infrastructure/database/DatabaseManager';
import { RepositoryFactory, repositoryFactory } from '../../infrastructure/repositories/RepositoryFactory';
import { isTauriEnvironment } from '../../infrastructure/runtime/environment';
import { logger } from '../../infrastructure/logging/Logger';
import {
  DateRange,
  ExecutiveSummaryMetrics,
  SalesAnalyticsView,
  InventoryAnalyticsView,
  FinancialAnalyticsView,
  CustomerAnalyticsView,
  ExportReportType,
  TimeSeriesPoint,
  TopProductAnalytics,
  PaymentMethodBreakdown,
  CategorySalesBreakdown,
  SaleDetailRow,
  CashSessionAuditRow,
} from './types';
import { resolveComparisonPeriod, calculateDelta } from './DateRangeUtils';
import { COUNTRY_PROFILES } from '../../config/countries';
import { CurrencyCode, SupportedCountryCode } from '../../types/country';
import { toMajorUnits } from '../../domain/common/money/Money';
import { businessDateYmd, shiftYmd } from '../../domain/common/time/BusinessCalendar';

export class OperationalAnalyticsService {
  constructor(
    private dbManager: DatabaseManager = databaseManager,
    private repoFactory: RepositoryFactory = repositoryFactory
  ) {}

  // ---------------------------------------------------------------------------
  // 1. EXECUTIVE SUMMARY
  // ---------------------------------------------------------------------------
  async getExecutiveSummary(businessId: string, range: DateRange): Promise<ExecutiveSummaryMetrics> {
    const comparison = resolveComparisonPeriod(range);

    // Current period sales & cost stats
    const currentSalesStats = await this.getSalesTotalsAndCostCoverage(businessId, range.fromUtc, range.toUtc);
    const prevSalesStats = await this.getSalesTotalsAndCostCoverage(businessId, comparison.fromUtc, comparison.toUtc);

    // Expenses
    const currentExpenses = await this.getOperatingExpensesTotal(businessId, range.fromUtc, range.toUtc, range.countryCode);
    const prevExpenses = await this.getOperatingExpensesTotal(businessId, comparison.fromUtc, comparison.toUtc, range.countryCode);

    // Deltas
    const totalSalesDelta = calculateDelta(currentSalesStats.totalSales, prevSalesStats.totalSales);
    const ticketCountDelta = calculateDelta(currentSalesStats.ticketCount, prevSalesStats.ticketCount);
    const currentAvg = currentSalesStats.ticketCount > 0 ? Math.round(currentSalesStats.totalSales / currentSalesStats.ticketCount) : 0;
    const prevAvg = prevSalesStats.ticketCount > 0 ? Math.round(prevSalesStats.totalSales / prevSalesStats.ticketCount) : 0;
    const averageTicketDelta = calculateDelta(currentAvg, prevAvg);
    const expensesDelta = calculateDelta(currentExpenses, prevExpenses);

    // Financial Rules
    const coverage = currentSalesStats.costCoveragePercent;
    let costQuality: 'COMPLETE' | 'PARTIAL' | 'NONE' = 'NONE';
    if (coverage >= 100) costQuality = 'COMPLETE';
    else if (coverage > 0) costQuality = 'PARTIAL';

    const canShowGlobalOperatingResult = coverage >= 100 && currentSalesStats.ticketCount > 0;
    const estimatedOperatingResult = canShowGlobalOperatingResult
      ? currentSalesStats.knownGrossProfit - currentExpenses
      : null;
    const knownOperatingResult = currentSalesStats.knownGrossProfit - currentExpenses;

    // Purchases
    const receivedPurchasesTotal = await this.getReceivedPurchasesTotal(businessId, range.fromUtc, range.toUtc);
    const openOrders = await this.getOpenPurchaseOrders(businessId);

    // Cash audit
    const cashStats = await this.getCashDiscrepancyStats(businessId, range.fromUtc, range.toUtc);

    // Inventory KPIs
    const invRepo = this.repoFactory.getInventoryQueryRepository();
    let inventoryMetrics = {
      totalProductsWithStock: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      estimatedTotalInventoryValue: 0,
    };
    try {
      inventoryMetrics = await invRepo.getMetrics(businessId);
    } catch (err) {
      logger.error('OperationalAnalyticsService', 'Error getting inventory metrics', { error: String(err) });
    }

    return {
      totalSales: totalSalesDelta,
      ticketCount: ticketCountDelta,
      averageTicket: averageTicketDelta,
      knownGrossProfit: currentSalesStats.knownGrossProfit,
      costCoveragePercent: coverage,
      costQuality,
      operatingExpenses: expensesDelta,
      canShowGlobalOperatingResult,
      estimatedOperatingResult,
      knownOperatingResult,
      receivedPurchasesTotal,
      openOrdersCount: openOrders.count,
      openOrdersTotal: openOrders.totalAmount,
      cashNetDifference: cashStats.netDifference,
      cashAbsoluteVariance: cashStats.absoluteVariance,
      cashSessionsWithDifferenceCount: cashStats.sessionsWithDifferenceCount,
      cashClosedSessionsCount: cashStats.closedSessionsCount,
      totalProductsWithStock: inventoryMetrics.totalProductsWithStock,
      lowStockCount: inventoryMetrics.lowStockCount,
      outOfStockCount: inventoryMetrics.outOfStockCount,
      totalInventoryValue: inventoryMetrics.estimatedTotalInventoryValue,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. SALES ANALYTICS
  // ---------------------------------------------------------------------------
  async getSalesAnalytics(businessId: string, range: DateRange): Promise<SalesAnalyticsView> {
    const stats = await this.getSalesTotalsAndCostCoverage(businessId, range.fromUtc, range.toUtc);
    const timeSeries = await this.getSalesTimeSeries(businessId, range);
    const hourlyDistribution = await this.getHourlySales(businessId, range.fromUtc, range.toUtc);
    const topProducts = await this.getTopProductsAnalytics(businessId, range.fromUtc, range.toUtc, 10);
    const paymentBreakdown = await this.getPaymentMethodBreakdown(businessId, range.fromUtc, range.toUtc);
    const categoryBreakdown = await this.getCategorySalesBreakdown(businessId, range.fromUtc, range.toUtc);
    const recentSales = await this.getSalesList(businessId, range.fromUtc, range.toUtc, 50);

    const averageTicket = stats.ticketCount > 0 ? Math.round(stats.totalSales / stats.ticketCount) : 0;

    return {
      summary: {
        totalSales: stats.totalSales,
        ticketCount: stats.ticketCount,
        averageTicket,
        totalDiscount: stats.totalDiscount,
        knownGrossProfit: stats.knownGrossProfit,
        costCoveragePercent: stats.costCoveragePercent,
        linesWithCostCount: stats.linesWithCostCount,
        totalLinesCount: stats.totalLinesCount,
      },
      timeSeries,
      hourlyDistribution,
      topProducts,
      paymentBreakdown,
      categoryBreakdown,
      recentSales,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. INVENTORY ANALYTICS
  // ---------------------------------------------------------------------------
  async getInventoryAnalytics(businessId: string, range: DateRange): Promise<InventoryAnalyticsView> {
    const invRepo = this.repoFactory.getInventoryQueryRepository();
    let metrics = {
      totalProductsWithStock: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalMovementsToday: 0,
      estimatedTotalInventoryValue: 0,
    };

    try {
      metrics = await invRepo.getMetrics(businessId);
    } catch (err) {
      logger.error('OperationalAnalyticsService', 'Error getting inventory metrics', { error: String(err) });
    }

    const lowStockTable = await this.getLowStockProducts(businessId);
    const categoryDistribution = await this.getInventoryByCategory(businessId);
    const receivedReceipts = await this.getReceivedReceiptsList(businessId, range.fromUtc, range.toUtc);
    const openOrders = await this.getOpenPurchaseOrdersList(businessId);
    const receivedPurchasesPeriod = await this.getReceivedPurchasesTotal(businessId, range.fromUtc, range.toUtc);

    const totalProducts = metrics.totalProductsWithStock + metrics.outOfStockCount;

    return {
      kpis: {
        totalProducts,
        productsWithStock: metrics.totalProductsWithStock,
        lowStockCount: metrics.lowStockCount,
        outOfStockCount: metrics.outOfStockCount,
        estimatedInventoryValue: metrics.estimatedTotalInventoryValue,
        receivedPurchasesPeriod,
        openOrdersCount: openOrders.length,
        openOrdersTotal: openOrders.reduce((sum, o) => sum + o.total, 0),
      },
      lowStockItems: lowStockTable,
      inventoryByCategory: categoryDistribution,
      receivedReceipts,
      openOrders,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. FINANCIAL ANALYTICS
  // ---------------------------------------------------------------------------
  async getFinancialAnalytics(businessId: string, range: DateRange): Promise<FinancialAnalyticsView> {
    const salesStats = await this.getSalesTotalsAndCostCoverage(businessId, range.fromUtc, range.toUtc);
    const expensesTotal = await this.getOperatingExpensesTotal(businessId, range.fromUtc, range.toUtc, range.countryCode);
    const receivedPurchasesTotal = await this.getReceivedPurchasesTotal(businessId, range.fromUtc, range.toUtc);

    const coverage = salesStats.costCoveragePercent;
    const isFullyCosted = coverage >= 100 && salesStats.ticketCount > 0;
    const canShowOperatingResult = isFullyCosted;
    const estimatedOperatingResult = canShowOperatingResult
      ? salesStats.knownGrossProfit - expensesTotal
      : null;
    const knownOperatingResult = salesStats.knownGrossProfit - expensesTotal;

    const expensesByCategory = await this.getExpensesByCategory(businessId, range.fromUtc, range.toUtc, range.countryCode);
    const expensesByPaymentMethod = await this.getExpensesByPaymentMethod(businessId, range.fromUtc, range.toUtc, range.countryCode);
    const cashAudit = await this.getCashSessionsAudit(businessId, range.fromUtc, range.toUtc);

    return {
      pnl: {
        netSales: salesStats.totalSales,
        knownCostOfGoodsSold: salesStats.knownCostTotal,
        knownGrossProfit: salesStats.knownGrossProfit,
        costCoveragePercent: coverage,
        isFullyCosted,
        operatingExpensesTotal: expensesTotal,
        canShowOperatingResult,
        estimatedOperatingResult,
        knownOperatingResult,
        receivedPurchasesTotal,
      },
      expensesByCategory,
      expensesByPaymentMethod,
      cashAudit,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. CUSTOMER ANALYTICS
  // ---------------------------------------------------------------------------
  async getCustomerAnalytics(businessId: string, range: DateRange): Promise<CustomerAnalyticsView> {
    let totalCustomers = 0;
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{ count: number }[]>(
            `SELECT COUNT(id) AS count FROM customers WHERE business_id = ? AND active = 1`,
            [businessId]
          );
          totalCustomers = rows.length > 0 ? rows[0].count : 0;
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error getting customer count SQLite', { error: String(err) });
      }
    } else {
      try {
        const list = await this.repoFactory.getCustomerRepository().list(businessId);
        totalCustomers = list.length;
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error getting customer count fallback', { error: String(err) });
      }
    }

    const salesSplit = await this.getCustomerSalesSplit(businessId, range.fromUtc, range.toUtc);
    const topCustomersInPeriod = await this.getTopCustomersInPeriod(businessId, range.fromUtc, range.toUtc, 10);

    const totalRevenue = salesSplit.identifiedRevenue + salesSplit.anonymousRevenue;
    const customerIdentificationRate = totalRevenue > 0
      ? Number(((salesSplit.identifiedRevenue / totalRevenue) * 100).toFixed(1))
      : 0;

    const topCustomer = topCustomersInPeriod.length > 0 ? topCustomersInPeriod[0] : null;

    return {
      kpis: {
        totalCustomers,
        activeCustomersInPeriod: topCustomersInPeriod.length,
        salesIdentifiedTotal: salesSplit.identifiedRevenue,
        salesAnonymousTotal: salesSplit.anonymousRevenue,
        customerIdentificationRate,
        topCustomerName: topCustomer ? topCustomer.name : null,
        topCustomerSpend: topCustomer ? topCustomer.totalSpentInPeriod : 0,
      },
      topCustomers: topCustomersInPeriod,
      salesSplit,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. CSV EXPORT (RFC 4180 COMPLIANT)
  // ---------------------------------------------------------------------------
  // 6. EXPORT UTILITY (EXCEL XLSX & CSV LATAM)
  // ---------------------------------------------------------------------------
  async getReportExportData(
    businessId: string,
    reportType: ExportReportType,
    range: DateRange
  ): Promise<{ headers: string[]; rows: (string | number)[][] }> {
    const currency = COUNTRY_PROFILES[range.countryCode as SupportedCountryCode]?.primaryCurrency.code ?? 'CLP';
    const toMoneyNumber = (minor: number): number => toMajorUnits(minor, currency as CurrencyCode);

    switch (reportType) {
      case 'SALES_SUMMARY': {
        const salesView = await this.getSalesAnalytics(businessId, range);
        const headers = ['Métrica', 'Valor'];
        const rows: (string | number)[][] = [
          ['Período', `${range.startDate} al ${range.endDate}`],
          ['Ventas Netas ($)', toMoneyNumber(salesView.summary.totalSales)],
          ['Cantidad de Tickets', salesView.summary.ticketCount],
          ['Ticket Promedio ($)', toMoneyNumber(salesView.summary.averageTicket)],
          ['Descuentos Otorgados ($)', toMoneyNumber(salesView.summary.totalDiscount)],
          ['Ganancia Bruta Conocida ($)', toMoneyNumber(salesView.summary.knownGrossProfit)],
          ['Cobertura de Costo (%)', `${salesView.summary.costCoveragePercent}%`],
          ['Líneas con Costo Registrado', `${salesView.summary.linesWithCostCount} de ${salesView.summary.totalLinesCount}`],
        ];
        return { headers, rows };
      }

      case 'SALES_LIST': {
        const sales = await this.getSalesList(businessId, range.fromUtc, range.toUtc, 1000);
        const headers = ['ID Venta', 'Fecha', 'Cliente', 'Items', 'Subtotal ($)', 'Descuento ($)', 'Total ($)', 'Método de Pago'];
        const rows: (string | number)[][] = sales.map((s) => [
          s.saleNumber,
          s.completedAt,
          s.customerName,
          s.itemCount,
          toMoneyNumber(s.subtotal),
          toMoneyNumber(s.discountTotal),
          toMoneyNumber(s.total),
          s.paymentMethods,
        ]);
        return { headers, rows };
      }

      case 'TOP_PRODUCTS': {
        const top = await this.getTopProductsAnalytics(businessId, range.fromUtc, range.toUtc, 100);
        const headers = ['Producto', 'Categoría', 'Unidad Base', 'Cantidad Vendida', 'Ingresos Totales ($)', '% del Total Ventas', 'Tickets'];
        const rows: (string | number)[][] = top.map((p) => [
          p.productName,
          p.categoryName,
          p.baseUnit,
          Number(p.quantitySold.toFixed(2)),
          toMoneyNumber(p.totalRevenue),
          `${p.revenuePercentOfTotal}%`,
          p.ticketCount,
        ]);
        return { headers, rows };
      }

      case 'INVENTORY_STOCK': {
        const invRepo = this.repoFactory.getInventoryQueryRepository();
        const stockData = await invRepo.listStockTable({ businessId, limit: 1000 });
        const headers = ['Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Estado', 'Costo Unitario ($)', 'Calidad de Costo'];
        const rows: (string | number)[][] = stockData.rows.map((r) => [
          r.product.name,
          r.categoryName || 'Sin categoría',
          Number((r.currentStock / 1000).toFixed(2)),
          r.minimumStock !== null ? Number((r.minimumStock / 1000).toFixed(2)) : 'N/A',
          r.status,
          r.estimatedCost !== null ? toMoneyNumber(r.estimatedCost) : 'N/A',
          r.costQuality,
        ]);
        return { headers, rows };
      }

      case 'OPERATING_EXPENSES': {
        const expQueryRepo = this.repoFactory.getExpenseQueryRepository();
        const expData = await expQueryRepo.list(businessId, {
          startDate: range.startDate,
          endDate: range.endDate,
          limit: 1000,
        });
        const headers = ['Fecha', 'Descripción', 'Categoría', 'Monto ($)', 'Método de Pago', 'Comprobante', 'Proveedor'];
        const rows: (string | number)[][] = expData.expenses.map((e) => [
          e.expenseDate,
          e.description,
          e.categoryNameSnapshot,
          toMoneyNumber(e.amount),
          e.paymentMethodCode,
          e.referenceDocument || 'N/A',
          e.supplierNameSnapshot || 'N/A',
        ]);
        return { headers, rows };
      }

      case 'CASH_SESSIONS_AUDIT': {
        const audit = await this.getCashSessionsAudit(businessId, range.fromUtc, range.toUtc);
        const headers = ['Caja', 'Apertura Por', 'Cierre Por', 'Fecha Apertura', 'Fecha Cierre', 'Monto Inicial ($)', 'Monto Esperado ($)', 'Monto Contado ($)', 'Diferencia ($)', 'Estado'];
        const rows: (string | number)[][] = audit.sessions.map((s) => [
          s.registerName,
          s.openedByName,
          s.closedByName,
          s.openedAt,
          s.closedAt || 'N/A',
          toMoneyNumber(s.initialCashAmount),
          toMoneyNumber(s.expectedCashAmount),
          s.countedCashAmount !== null ? toMoneyNumber(s.countedCashAmount) : 'N/A',
          toMoneyNumber(s.differenceAmount),
          s.status,
        ]);
        return { headers, rows };
      }
    }
  }

  async exportReportCsv(
    businessId: string,
    reportType: ExportReportType,
    range: DateRange,
    delimiter: ',' | ';' = ','
  ): Promise<string> {
    const { headers, rows } = await this.getReportExportData(businessId, reportType, range);

    const sanitizeCell = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [headers.join(delimiter), ...rows.map((r) => r.map(sanitizeCell).join(delimiter))].join('\r\n');
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS (SQLITE OPTIMIZED + FALLBACK SAFE)
  // ===========================================================================

  private async getSalesTotalsAndCostCoverage(
    businessId: string,
    fromUtc: string,
    toUtc: string
  ): Promise<{
    totalSales: number;
    ticketCount: number;
    totalDiscount: number;
    knownGrossProfit: number;
    knownCostTotal: number;
    costCoveragePercent: number;
    linesWithCostCount: number;
    totalLinesCount: number;
  }> {
    const saleRepo = this.repoFactory.getSaleRepository();
    const summary = await saleRepo.getSalesSummary(businessId, fromUtc, toUtc);
    return {
      totalSales: summary.totalSales,
      ticketCount: summary.ticketCount,
      totalDiscount: summary.totalDiscount,
      knownGrossProfit: summary.knownGrossProfit,
      knownCostTotal: summary.knownCostTotal,
      costCoveragePercent: summary.costCoveragePercent,
      linesWithCostCount: summary.linesWithCostCount,
      totalLinesCount: summary.totalLinesCount,
    };
  }

  private async getOperatingExpensesTotal(businessId: string, fromUtc: string, toUtc: string, countryCode?: string): Promise<number> {
    const startDate = countryCode ? businessDateYmd(new Date(fromUtc), countryCode) : fromUtc.slice(0, 10);
    const endDate = countryCode ? businessDateYmd(new Date(toUtc), countryCode) : toUtc.slice(0, 10);

    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{ total: number }[]>(
            `SELECT COALESCE(SUM(amount), 0) AS total 
             FROM operating_expenses 
             WHERE business_id = ? AND expense_date >= ? AND expense_date <= ?`,
            [businessId, startDate, endDate]
          );
          return rows.length > 0 ? rows[0].total : 0;
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getOperatingExpensesTotal SQLite', { error: String(err) });
      }
    }

    const expRepo = this.repoFactory.getExpenseQueryRepository();
    const res = await expRepo.list(businessId, { startDate, endDate, limit: 1000 });
    return res.expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  private async getReceivedPurchasesTotal(businessId: string, fromUtc: string, toUtc: string): Promise<number> {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{ total: number }[]>(
            `SELECT COALESCE(SUM(pri.line_cost_total), 0) AS total
             FROM purchase_receipt_items pri
             JOIN purchase_receipts pr ON pr.id = pri.purchase_receipt_id AND pr.business_id = pri.business_id
             WHERE pri.business_id = ? AND pr.received_at >= ? AND pr.received_at <= ?`,
            [businessId, fromUtc, toUtc]
          );
          return rows.length > 0 ? rows[0].total : 0;
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getReceivedPurchasesTotal SQLite', { error: String(err) });
      }
    }
    return 0;
  }

  private async getOpenPurchaseOrders(businessId: string): Promise<{ count: number; totalAmount: number }> {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{ count: number; total: number }[]>(
            `SELECT COUNT(id) AS count, COALESCE(SUM(total), 0) AS total
             FROM purchase_orders
             WHERE business_id = ? AND status IN ('DRAFT', 'ORDERED')`,
            [businessId]
          );
          return {
            count: rows.length > 0 ? rows[0].count : 0,
            totalAmount: rows.length > 0 ? rows[0].total : 0,
          };
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getOpenPurchaseOrders SQLite', { error: String(err) });
      }
    }
    return { count: 0, totalAmount: 0 };
  }

  private async getCashDiscrepancyStats(
    businessId: string,
    fromUtc: string,
    toUtc: string
  ): Promise<{
    netDifference: number;
    absoluteVariance: number;
    sessionsWithDifferenceCount: number;
    closedSessionsCount: number;
  }> {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            net_diff: number;
            abs_variance: number;
            diff_count: number;
            closed_count: number;
          }[]>(
            `SELECT 
              COALESCE(SUM(difference_amount), 0) AS net_diff,
              COALESCE(SUM(ABS(difference_amount)), 0) AS abs_variance,
              COALESCE(SUM(CASE WHEN difference_amount != 0 THEN 1 ELSE 0 END), 0) AS diff_count,
              COUNT(id) AS closed_count
            FROM cash_sessions
            WHERE business_id = ? 
              AND status = 'CLOSED' 
              AND counted_cash_amount IS NOT NULL
              AND closed_at >= ? 
              AND closed_at <= ?`,
            [businessId, fromUtc, toUtc]
          );

          if (rows.length > 0) {
            return {
              netDifference: rows[0].net_diff,
              absoluteVariance: rows[0].abs_variance,
              sessionsWithDifferenceCount: rows[0].diff_count,
              closedSessionsCount: rows[0].closed_count,
            };
          }
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getCashDiscrepancyStats SQLite', { error: String(err) });
      }
    }
    return { netDifference: 0, absoluteVariance: 0, sessionsWithDifferenceCount: 0, closedSessionsCount: 0 };
  }

  private async getSalesTimeSeries(businessId: string, range: DateRange): Promise<TimeSeriesPoint[]> {
    const sales = await this.repoFactory.getSaleRepository().listSales(businessId);
    const days = new Map<string, { sales: number; count: number }>();
    for (const sale of sales) {
      if (sale.status !== 'COMPLETED' || sale.completedAt < range.fromUtc || sale.completedAt > range.toUtc) continue;
      const ymd = range.countryCode
        ? businessDateYmd(new Date(sale.completedAt), range.countryCode)
        : sale.completedAt.slice(0, 10);
      const current = days.get(ymd) ?? { sales: 0, count: 0 };
      current.sales += sale.total;
      current.count += 1;
      days.set(ymd, current);
    }
    const result: TimeSeriesPoint[] = [];
    for (let ymd = range.startDate; ymd <= range.endDate; ymd = shiftYmd(ymd, 1)) {
      const current = days.get(ymd) ?? { sales: 0, count: 0 };
      const date = new Date(`${ymd}T12:00:00.000Z`);
      result.push({
        date: ymd,
        label: `${Number(ymd.slice(8))} ${date.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' })}`,
        sales: current.sales,
        ticketCount: current.count,
      });
    }
    return result;
  }

  private async getHourlySales(businessId: string, fromUtc: string, toUtc: string) {
    const saleRepo = this.repoFactory.getSaleRepository();
    return saleRepo.getHourlySales(businessId, fromUtc, toUtc);
  }

  private async getTopProductsAnalytics(
    businessId: string,
    fromUtc: string,
    toUtc: string,
    limit = 10
  ): Promise<TopProductAnalytics[]> {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const totalsRow = await db.select<{ total_revenue: number }[]>(
            `SELECT COALESCE(SUM(total), 0) AS total_revenue 
             FROM sales 
             WHERE business_id = ? AND completed_at >= ? AND completed_at <= ? AND status = 'COMPLETED'`,
            [businessId, fromUtc, toUtc]
          );
          const totalSalesRevenue = totalsRow.length > 0 ? totalsRow[0].total_revenue : 0;

          const rows = await db.select<{
            product_id: string;
            product_name: string;
            category_name: string | null;
            base_unit: string;
            total_quantity_scaled: number;
            total_revenue: number;
            ticket_count: number;
            estimated_cost: number | null;
            known_lines: number;
            total_lines: number;
          }[]>(
            `SELECT 
              si.product_id,
              si.product_name_snapshot AS product_name,
              c.name AS category_name,
              si.base_unit,
              COALESCE(SUM(si.quantity), 0) AS total_quantity_scaled,
              COALESCE(SUM(si.line_total), 0) AS total_revenue,
              COUNT(DISTINCT si.sale_id) AS ticket_count,
              SUM(CASE WHEN si.cost_quality_snapshot = 'REAL' AND si.unit_cost_snapshot IS NOT NULL AND si.line_cost_total IS NOT NULL THEN si.line_cost_total ELSE 0 END) AS estimated_cost,
              SUM(CASE WHEN si.cost_quality_snapshot = 'REAL' AND si.unit_cost_snapshot IS NOT NULL AND si.line_cost_total IS NOT NULL THEN 1 ELSE 0 END) AS known_lines,
              COUNT(si.id) AS total_lines
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id AND s.business_id = si.business_id
            LEFT JOIN products p ON p.id = si.product_id AND p.business_id = si.business_id
            LEFT JOIN categories c ON c.id = p.category_id AND c.business_id = si.business_id
            WHERE s.business_id = ? 
              AND s.completed_at >= ? 
              AND s.completed_at <= ? 
              AND s.status = 'COMPLETED'
              AND si.product_id IS NOT NULL
              AND (si.line_type IS NULL OR si.line_type != 'OPEN_AMOUNT')
            GROUP BY si.product_id, si.product_name_snapshot, c.name, si.base_unit
            ORDER BY total_revenue DESC, total_quantity_scaled DESC
            LIMIT ?`,
            [businessId, fromUtc, toUtc, limit]
          );

          return rows.map((r) => {
            const revenuePct = totalSalesRevenue > 0
              ? Number(((r.total_revenue / totalSalesRevenue) * 100).toFixed(1))
              : 0;
            const completeCost = r.total_lines > 0 && r.known_lines === r.total_lines;
            const grossProfit = completeCost && r.estimated_cost !== null ? r.total_revenue - r.estimated_cost : null;

            return {
              productId: r.product_id,
              productName: r.product_name,
              categoryName: r.category_name || 'Sin categoría',
              baseUnit: r.base_unit,
              quantitySold: r.total_quantity_scaled / 1000,
              totalRevenue: r.total_revenue,
              revenuePercentOfTotal: revenuePct,
              ticketCount: r.ticket_count,
              estimatedCost: completeCost ? r.estimated_cost : null,
              grossProfit,
            };
          });
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getTopProductsAnalytics SQLite', { error: String(err) });
      }
    }

    const saleRepo = this.repoFactory.getSaleRepository();
    const rows = await saleRepo.getTopSellingProducts(businessId, fromUtc, toUtc, limit);
    const periodSales = (await saleRepo.listSales(businessId)).filter((sale) =>
      sale.status === 'COMPLETED' && sale.completedAt >= fromUtc && sale.completedAt <= toUtc,
    );
    const saleDetails = await Promise.all(periodSales.map((sale) => saleRepo.getSaleById(sale.id)));
    const costs = new Map<string, { knownCost: number; knownLines: number; totalLines: number }>();
    for (const detail of saleDetails) {
      if (!detail) continue;
      for (const line of detail.items) {
        if (!line.productId || line.lineType === 'OPEN_AMOUNT') continue;
        const group = costs.get(line.productId) ?? { knownCost: 0, knownLines: 0, totalLines: 0 };
        group.totalLines += 1;
        if (line.costQualitySnapshot === 'REAL' && line.unitCostSnapshot != null && line.lineCostTotal != null) {
          group.knownCost += line.lineCostTotal;
          group.knownLines += 1;
        }
        costs.set(line.productId, group);
      }
    }
    const totalRevenue = rows.reduce((sum, row) => sum + row.totalRevenue, 0);
    return rows.map((r) => {
      const cost = costs.get(r.productId);
      const completeCost = cost !== undefined && cost.totalLines > 0 && cost.knownLines === cost.totalLines;
      return {
      productId: r.productId,
      productName: r.productName,
      categoryName: 'General',
      baseUnit: r.baseUnit,
      quantitySold: r.totalQuantityMajor,
      totalRevenue: r.totalRevenue,
      revenuePercentOfTotal: totalRevenue > 0 ? Number(((r.totalRevenue / totalRevenue) * 100).toFixed(1)) : 0,
      ticketCount: r.transactionCount,
      estimatedCost: completeCost ? cost.knownCost : null,
      grossProfit: completeCost ? r.totalRevenue - cost.knownCost : null,
      };
    });
  }

  private async getPaymentMethodBreakdown(
    businessId: string,
    fromUtc: string,
    toUtc: string
  ): Promise<PaymentMethodBreakdown[]> {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            payment_method_code: string;
            payment_method_name_snapshot: string;
            total_amount: number;
            tx_count: number;
          }[]>(
            `SELECT 
              sp.payment_method_code,
              sp.payment_method_name_snapshot,
              COALESCE(SUM(sp.amount), 0) AS total_amount,
              COUNT(DISTINCT sp.sale_id) AS tx_count
            FROM sale_payments sp
            JOIN sales s ON s.id = sp.sale_id AND s.business_id = sp.business_id
            WHERE s.business_id = ? 
              AND s.completed_at >= ? 
              AND s.completed_at <= ? 
              AND s.status = 'COMPLETED'
            GROUP BY sp.payment_method_code, sp.payment_method_name_snapshot
            ORDER BY total_amount DESC`,
            [businessId, fromUtc, toUtc]
          );

          const totalOverall = rows.reduce((sum, r) => sum + r.total_amount, 0);

          return rows.map((r) => ({
            code: r.payment_method_code,
            name: r.payment_method_name_snapshot || r.payment_method_code,
            totalAmount: r.total_amount,
            transactionCount: r.tx_count,
            percentage: totalOverall > 0 ? Number(((r.total_amount / totalOverall) * 100).toFixed(1)) : 0,
          }));
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getPaymentMethodBreakdown SQLite', { error: String(err) });
      }
    }
    const repo = this.repoFactory.getSaleRepository();
    const sales = (await repo.listSales(businessId)).filter((sale) =>
      sale.status === 'COMPLETED' && sale.completedAt >= fromUtc && sale.completedAt <= toUtc,
    );
    const details = await Promise.all(sales.map((sale) => repo.getSaleById(sale.id)));
    const groups = new Map<string, { name: string; amount: number; saleIds: Set<string> }>();
    for (const detail of details) {
      if (!detail) continue;
      for (const payment of detail.payments) {
        const code = payment.paymentMethodCode;
        const group = groups.get(code) ?? { name: payment.paymentMethodNameSnapshot, amount: 0, saleIds: new Set<string>() };
        group.amount += payment.amount;
        group.saleIds.add(detail.sale.id);
        groups.set(code, group);
      }
    }
    const total = [...groups.values()].reduce((sum, group) => sum + group.amount, 0);
    return [...groups.entries()].map(([code, group]) => ({
      code, name: group.name, totalAmount: group.amount, transactionCount: group.saleIds.size,
      percentage: total > 0 ? Number(((group.amount / total) * 100).toFixed(1)) : 0,
    }));
  }

  private async getCategorySalesBreakdown(
    businessId: string,
    fromUtc: string,
    toUtc: string
  ): Promise<CategorySalesBreakdown[]> {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            category_id: string | null;
            category_name: string | null;
            category_color: string | null;
            total_revenue: number;
            item_count: number;
          }[]>(
            `SELECT 
              c.id AS category_id,
              c.name AS category_name,
              c.color AS category_color,
              COALESCE(SUM(si.line_total), 0) AS total_revenue,
              COUNT(si.id) AS item_count
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id AND s.business_id = si.business_id
            LEFT JOIN products p ON p.id = si.product_id AND p.business_id = si.business_id
            LEFT JOIN categories c ON c.id = p.category_id AND c.business_id = si.business_id
            WHERE s.business_id = ? 
              AND s.completed_at >= ? 
              AND s.completed_at <= ? 
              AND s.status = 'COMPLETED'
            GROUP BY c.id, c.name, c.color
            ORDER BY total_revenue DESC`,
            [businessId, fromUtc, toUtc]
          );

          const totalRev = rows.reduce((sum, r) => sum + r.total_revenue, 0);

          return rows.map((r) => ({
            categoryId: r.category_id || 'uncategorized',
            categoryName: r.category_name || 'Sin categoría',
            color: r.category_color || undefined,
            totalRevenue: r.total_revenue,
            itemCount: r.item_count,
            percentage: totalRev > 0 ? Number(((r.total_revenue / totalRev) * 100).toFixed(1)) : 0,
          }));
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getCategorySalesBreakdown SQLite', { error: String(err) });
      }
    }
    const saleRepo = this.repoFactory.getSaleRepository();
    const productRepo = this.repoFactory.getProductRepository();
    const sales = (await saleRepo.listSales(businessId)).filter((sale) =>
      sale.status === 'COMPLETED' && sale.completedAt >= fromUtc && sale.completedAt <= toUtc,
    );
    const details = await Promise.all(sales.map((sale) => saleRepo.getSaleById(sale.id)));
    const groups = new Map<string, { name: string; color?: string; revenue: number; count: number }>();
    const productCategories = new Map<string, { id: string; name: string; color?: string }>();
    for (const detail of details) {
      if (!detail) continue;
      for (const line of detail.items) {
        let category: { id: string; name: string; color?: string } = { id: 'uncategorized', name: 'Sin categoría' };
        if (line.productId) {
          let resolved = productCategories.get(line.productId);
          if (!resolved) {
            const product = await productRepo.getDetailById(line.productId, businessId);
            resolved = { id: product?.category?.id ?? 'uncategorized', name: product?.category?.name ?? 'Sin categoría',
              color: product?.category?.color ?? undefined };
            productCategories.set(line.productId, resolved);
          }
          category = resolved;
        }
        const group = groups.get(category.id) ?? { name: category.name, color: category.color, revenue: 0, count: 0 };
        group.revenue += line.lineTotal;
        group.count += 1;
        groups.set(category.id, group);
      }
    }
    const total = [...groups.values()].reduce((sum, group) => sum + group.revenue, 0);
    return [...groups.entries()].map(([categoryId, group]) => ({
      categoryId, categoryName: group.name, color: group.color, totalRevenue: group.revenue,
      itemCount: group.count, percentage: total > 0 ? Number(((group.revenue / total) * 100).toFixed(1)) : 0,
    }));
  }

  private async getSalesList(
    businessId: string,
    fromUtc: string,
    toUtc: string,
    limit = 50
  ): Promise<SaleDetailRow[]> {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            id: string;
            sale_number: string;
            completed_at: string;
            customer_name_snapshot: string;
            subtotal: number;
            discount_total: number;
            total: number;
            item_count: number;
            payment_methods: string;
          }[]>(
            `SELECT 
              s.id,
              s.sale_number,
              s.completed_at,
              s.customer_name_snapshot,
              s.subtotal,
              s.discount_total,
              s.total,
              COUNT(DISTINCT si.id) AS item_count,
              COALESCE(GROUP_CONCAT(DISTINCT sp.payment_method_name_snapshot), 'Efectivo') AS payment_methods
            FROM sales s
            LEFT JOIN sale_items si ON si.sale_id = s.id AND si.business_id = s.business_id
            LEFT JOIN sale_payments sp ON sp.sale_id = s.id AND sp.business_id = s.business_id
            WHERE s.business_id = ? 
              AND s.completed_at >= ? 
              AND s.completed_at <= ? 
              AND s.status = 'COMPLETED'
            GROUP BY s.id, s.sale_number, s.completed_at, s.customer_name_snapshot, s.subtotal, s.discount_total, s.total
            ORDER BY s.completed_at DESC
            LIMIT ?`,
            [businessId, fromUtc, toUtc, limit]
          );

          return rows.map((r) => ({
            id: r.id,
            saleNumber: r.sale_number,
            completedAt: r.completed_at,
            customerName: r.customer_name_snapshot || 'Cliente General',
            itemCount: r.item_count,
            subtotal: r.subtotal,
            discountTotal: r.discount_total,
            total: r.total,
            paymentMethods: r.payment_methods || 'N/A',
          }));
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getSalesList SQLite', { error: String(err) });
      }
    }
    const repo = this.repoFactory.getSaleRepository();
    const sales = (await repo.listSales(businessId))
      .filter((sale) => sale.status === 'COMPLETED' && sale.completedAt >= fromUtc && sale.completedAt <= toUtc)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, limit);
    const details = await Promise.all(sales.map((sale) => repo.getSaleById(sale.id)));
    return sales.map((sale, index) => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      completedAt: sale.completedAt,
      customerName: sale.customerNameSnapshot,
      itemCount: details[index]?.items.length ?? 0,
      subtotal: sale.subtotal,
      discountTotal: sale.discountTotal,
      total: sale.total,
      paymentMethods: details[index]?.payments.map((payment) => payment.paymentMethodNameSnapshot).join(', ') || 'N/A',
    }));
  }

  private async getLowStockProducts(businessId: string) {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            product_id: string;
            product_name: string;
            category_name: string | null;
            current_stock: number;
            minimum_stock: number;
            unit_cost: number | null;
          }[]>(
            `SELECT 
              p.id AS product_id,
              p.name AS product_name,
              c.name AS category_name,
              p.stock_quantity AS current_stock,
              p.min_stock_alert AS minimum_stock,
              p.cost_minor AS unit_cost
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id AND c.business_id = p.business_id
            WHERE p.business_id = ? 
              AND p.is_active = 1 
              AND p.track_inventory = 1 
              AND p.stock_quantity <= p.min_stock_alert
            ORDER BY (p.stock_quantity - p.min_stock_alert) ASC
            LIMIT 20`,
            [businessId]
          );

          return rows.map((r) => {
            const currentStock = r.current_stock / 1000;
            const minStock = r.minimum_stock / 1000;
            const deficit = Math.max(0, minStock - currentStock);
            const deficitCost = r.unit_cost ? Math.round(deficit * r.unit_cost) : null;

            return {
              productId: r.product_id,
              productName: r.product_name,
              categoryName: r.category_name || 'Sin categoría',
              currentStock,
              minimumStock: minStock,
              deficit,
              unitCost: r.unit_cost,
              estimatedDeficitCost: deficitCost,
            };
          });
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getLowStockProducts SQLite', { error: String(err) });
      }
    }
    return [];
  }

  private async getInventoryByCategory(businessId: string) {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            category_name: string | null;
            product_count: number;
            stock_value: number;
          }[]>(
            `SELECT 
              c.name AS category_name,
              COUNT(p.id) AS product_count,
              COALESCE(SUM(CASE WHEN p.cost_minor IS NOT NULL THEN (p.stock_quantity * p.cost_minor / 1000) ELSE 0 END), 0) AS stock_value
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id AND c.business_id = p.business_id
            WHERE p.business_id = ? AND p.is_active = 1 AND p.track_inventory = 1
            GROUP BY c.id, c.name
            ORDER BY stock_value DESC`,
            [businessId]
          );

          const totalVal = rows.reduce((sum, r) => sum + r.stock_value, 0);

          return rows.map((r) => ({
            categoryName: r.category_name || 'Sin categoría',
            productCount: r.product_count,
            stockValue: Math.round(r.stock_value),
            percentage: totalVal > 0 ? Number(((r.stock_value / totalVal) * 100).toFixed(1)) : 0,
          }));
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getInventoryByCategory SQLite', { error: String(err) });
      }
    }
    return [];
  }

  private async getReceivedReceiptsList(businessId: string, fromUtc: string, toUtc: string) {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            receipt_id: string;
            receipt_number: string;
            received_at: string;
            order_number: string;
            supplier_name: string | null;
            item_count: number;
            total_cost: number;
          }[]>(
            `SELECT 
              pr.id AS receipt_id,
              pr.receipt_number,
              pr.received_at,
              po.order_number,
              s.name AS supplier_name,
              COUNT(pri.id) AS item_count,
              COALESCE(SUM(pri.line_cost_total), 0) AS total_cost
            FROM purchase_receipts pr
            JOIN purchase_orders po ON po.id = pr.purchase_order_id AND po.business_id = pr.business_id
            LEFT JOIN suppliers s ON s.id = po.supplier_id AND s.business_id = po.business_id
            LEFT JOIN purchase_receipt_items pri ON pri.purchase_receipt_id = pr.id AND pri.business_id = pr.business_id
            WHERE pr.business_id = ? 
              AND pr.received_at >= ? 
              AND pr.received_at <= ?
            GROUP BY pr.id, pr.receipt_number, pr.received_at, po.order_number, s.name
            ORDER BY pr.received_at DESC
            LIMIT 20`,
            [businessId, fromUtc, toUtc]
          );

          return rows.map((r) => ({
            receiptId: r.receipt_id,
            receiptNumber: r.receipt_number,
            receivedAt: r.received_at,
            orderNumber: r.order_number,
            supplierName: r.supplier_name || 'Proveedor General',
            itemCount: r.item_count,
            totalCost: r.total_cost,
          }));
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getReceivedReceiptsList SQLite', { error: String(err) });
      }
    }
    return [];
  }

  private async getOpenPurchaseOrdersList(businessId: string) {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            id: string;
            order_number: string;
            supplier_name: string | null;
            status: string;
            created_at: string;
            expected_date: string | null;
            total: number;
          }[]>(
            `SELECT 
              po.id,
              po.order_number,
              s.name AS supplier_name,
              po.status,
              po.created_at,
              po.expected_date,
              po.total
            FROM purchase_orders po
            LEFT JOIN suppliers s ON s.id = po.supplier_id AND s.business_id = po.business_id
            WHERE po.business_id = ? AND po.status IN ('DRAFT', 'ORDERED')
            ORDER BY po.created_at DESC
            LIMIT 20`,
            [businessId]
          );

          return rows.map((r) => ({
            orderId: r.id,
            orderNumber: r.order_number,
            supplierName: r.supplier_name || 'Proveedor General',
            status: r.status,
            createdAt: r.created_at,
            expectedDate: r.expected_date,
            total: r.total,
          }));
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getOpenPurchaseOrdersList SQLite', { error: String(err) });
      }
    }
    return [];
  }

  private async getExpensesByCategory(businessId: string, fromUtc: string, toUtc: string, countryCode?: string) {
    const startDate = countryCode ? businessDateYmd(new Date(fromUtc), countryCode) : fromUtc.slice(0, 10);
    const endDate = countryCode ? businessDateYmd(new Date(toUtc), countryCode) : toUtc.slice(0, 10);

    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            category_id: string;
            category_name_snapshot: string;
            total_amount: number;
            expense_count: number;
          }[]>(
            `SELECT 
              category_id,
              category_name_snapshot,
              COALESCE(SUM(amount), 0) AS total_amount,
              COUNT(id) AS expense_count
            FROM operating_expenses
            WHERE business_id = ? AND expense_date >= ? AND expense_date <= ?
            GROUP BY category_id, category_name_snapshot
            ORDER BY total_amount DESC`,
            [businessId, startDate, endDate]
          );

          const totalOverall = rows.reduce((sum, r) => sum + r.total_amount, 0);

          return rows.map((r) => ({
            categoryId: r.category_id,
            categoryName: r.category_name_snapshot,
            totalAmount: r.total_amount,
            percentage: totalOverall > 0 ? Number(((r.total_amount / totalOverall) * 100).toFixed(1)) : 0,
            expenseCount: r.expense_count,
          }));
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getExpensesByCategory SQLite', { error: String(err) });
      }
    }
    return [];
  }

  private async getExpensesByPaymentMethod(businessId: string, fromUtc: string, toUtc: string, countryCode?: string) {
    const startDate = countryCode ? businessDateYmd(new Date(fromUtc), countryCode) : fromUtc.slice(0, 10);
    const endDate = countryCode ? businessDateYmd(new Date(toUtc), countryCode) : toUtc.slice(0, 10);

    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            payment_method_code: string;
            total_amount: number;
          }[]>(
            `SELECT 
              payment_method_code,
              COALESCE(SUM(amount), 0) AS total_amount
            FROM operating_expenses
            WHERE business_id = ? AND expense_date >= ? AND expense_date <= ?
            GROUP BY payment_method_code
            ORDER BY total_amount DESC`,
            [businessId, startDate, endDate]
          );

          const totalOverall = rows.reduce((sum, r) => sum + r.total_amount, 0);

          return rows.map((r) => ({
            methodCode: r.payment_method_code,
            totalAmount: r.total_amount,
            percentage: totalOverall > 0 ? Number(((r.total_amount / totalOverall) * 100).toFixed(1)) : 0,
          }));
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getExpensesByPaymentMethod SQLite', { error: String(err) });
      }
    }
    return [];
  }

  private async getCashSessionsAudit(businessId: string, fromUtc: string, toUtc: string) {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            id: string;
            register_name: string | null;
            opened_by_name: string;
            closed_by_name: string | null;
            opened_at: string;
            closed_at: string | null;
            initial_cash_amount: number;
            expected_cash_amount: number;
            counted_cash_amount: number | null;
            difference_amount: number;
            status: string;
          }[]>(
            `SELECT 
              cs.id,
              cr.name AS register_name,
              cs.opened_by_name_snapshot AS opened_by_name,
              cs.closed_by_name_snapshot AS closed_by_name,
              cs.opened_at,
              cs.closed_at,
              cs.initial_cash_amount,
              cs.expected_cash_amount,
              cs.counted_cash_amount,
              cs.difference_amount,
              cs.status
            FROM cash_sessions cs
            LEFT JOIN cash_registers cr ON cr.id = cs.cash_register_id AND cr.business_id = cs.business_id
            WHERE cs.business_id = ? 
              AND cs.opened_at >= ? 
              AND cs.opened_at <= ?
            ORDER BY cs.opened_at DESC
            LIMIT 50`,
            [businessId, fromUtc, toUtc]
          );

          const closedSessions = rows.filter((r) => r.status === 'CLOSED' && r.counted_cash_amount !== null);
          const totalClosed = closedSessions.length;
          const diffCount = closedSessions.filter((r) => r.difference_amount !== 0).length;
          const netDiff = closedSessions.reduce((sum, r) => sum + r.difference_amount, 0);
          const absVariance = closedSessions.reduce((sum, r) => sum + Math.abs(r.difference_amount), 0);

          const sessionRows: CashSessionAuditRow[] = rows.map((r) => ({
            sessionId: r.id,
            registerName: r.register_name || 'Caja Principal',
            openedByName: r.opened_by_name,
            closedByName: r.closed_by_name || 'N/A',
            openedAt: r.opened_at,
            closedAt: r.closed_at,
            initialCashAmount: r.initial_cash_amount,
            expectedCashAmount: r.expected_cash_amount,
            countedCashAmount: r.counted_cash_amount,
            differenceAmount: r.difference_amount,
            status: r.status as 'OPEN' | 'CLOSED',
          }));

          return {
            totalClosedSessions: totalClosed,
            sessionsWithDiscrepancyCount: diffCount,
            netCashDifference: netDiff,
            absoluteCashVariance: absVariance,
            sessions: sessionRows,
          };
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getCashSessionsAudit SQLite', { error: String(err) });
      }
    }

    return {
      totalClosedSessions: 0,
      sessionsWithDiscrepancyCount: 0,
      netCashDifference: 0,
      absoluteCashVariance: 0,
      sessions: [],
    };
  }

  private async getCustomerSalesSplit(businessId: string, fromUtc: string, toUtc: string) {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            is_identified: number;
            total_revenue: number;
            ticket_count: number;
          }[]>(
            `SELECT 
              CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END AS is_identified,
              COALESCE(SUM(total), 0) AS total_revenue,
              COUNT(id) AS ticket_count
            FROM sales
            WHERE business_id = ? 
              AND completed_at >= ? 
              AND completed_at <= ? 
              AND status = 'COMPLETED'
            GROUP BY (CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END)`,
            [businessId, fromUtc, toUtc]
          );

          let identifiedRevenue = 0;
          let identifiedTickets = 0;
          let anonymousRevenue = 0;
          let anonymousTickets = 0;

          rows.forEach((r) => {
            if (r.is_identified === 1) {
              identifiedRevenue = r.total_revenue;
              identifiedTickets = r.ticket_count;
            } else {
              anonymousRevenue = r.total_revenue;
              anonymousTickets = r.ticket_count;
            }
          });

          return {
            identifiedRevenue,
            identifiedTickets,
            anonymousRevenue,
            anonymousTickets,
          };
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getCustomerSalesSplit SQLite', { error: String(err) });
      }
    }

    const sales = (await this.repoFactory.getSaleRepository().listSales(businessId)).filter((sale) =>
      sale.status === 'COMPLETED' && sale.completedAt >= fromUtc && sale.completedAt <= toUtc,
    );
    return sales.reduce((result, sale) => {
      if (sale.customerId) {
        result.identifiedRevenue += sale.total;
        result.identifiedTickets += 1;
      } else {
        result.anonymousRevenue += sale.total;
        result.anonymousTickets += 1;
      }
      return result;
    }, { identifiedRevenue: 0, identifiedTickets: 0, anonymousRevenue: 0, anonymousTickets: 0 });
  }

  private async getTopCustomersInPeriod(
    businessId: string,
    fromUtc: string,
    toUtc: string,
    limit = 10
  ) {
    if (isTauriEnvironment()) {
      try {
        const db = await this.dbManager.getDatabase();
        if (db) {
          const rows = await db.select<{
            customer_id: string;
            customer_name: string;
            phone: string | null;
            email: string | null;
            total_spent: number;
            ticket_count: number;
            last_purchase: string | null;
          }[]>(
            `SELECT 
              c.id AS customer_id,
              c.name AS customer_name,
              c.phone,
              c.email,
              COALESCE(SUM(s.total), 0) AS total_spent,
              COUNT(s.id) AS ticket_count,
              MAX(s.completed_at) AS last_purchase
            FROM customers c
            JOIN sales s ON s.customer_id = c.id AND s.business_id = c.business_id
            WHERE c.business_id = ? 
              AND s.completed_at >= ? 
              AND s.completed_at <= ? 
              AND s.status = 'COMPLETED'
            GROUP BY c.id, c.name, c.phone, c.email
            ORDER BY total_spent DESC
            LIMIT ?`,
            [businessId, fromUtc, toUtc, limit]
          );

          return rows.map((r) => ({
            customerId: r.customer_id,
            name: r.customer_name,
            phone: r.phone,
            email: r.email,
            totalSpentInPeriod: r.total_spent,
            ticketCountInPeriod: r.ticket_count,
            averageTicket: r.ticket_count > 0 ? Math.round(r.total_spent / r.ticket_count) : 0,
            lastPurchaseDate: r.last_purchase,
          }));
        }
      } catch (err) {
        logger.error('OperationalAnalyticsService', 'Error in getTopCustomersInPeriod SQLite', { error: String(err) });
      }
    }
    const sales = (await this.repoFactory.getSaleRepository().listSales(businessId)).filter((sale) =>
      sale.status === 'COMPLETED' && sale.customerId && sale.completedAt >= fromUtc && sale.completedAt <= toUtc,
    );
    const groups = new Map<string, { name: string; spent: number; count: number; last: string }>();
    for (const sale of sales) {
      const customerId = sale.customerId!;
      const group = groups.get(customerId) ?? { name: sale.customerNameSnapshot, spent: 0, count: 0, last: sale.completedAt };
      group.spent += sale.total;
      group.count += 1;
      if (sale.completedAt > group.last) group.last = sale.completedAt;
      groups.set(customerId, group);
    }
    return [...groups.entries()].sort((a, b) => b[1].spent - a[1].spent).slice(0, limit)
      .map(([customerId, group]) => ({
        customerId, name: group.name, phone: null, email: null,
        totalSpentInPeriod: group.spent, ticketCountInPeriod: group.count,
        averageTicket: Math.round(group.spent / group.count), lastPurchaseDate: group.last,
      }));
  }
}

export const operationalAnalyticsService = new OperationalAnalyticsService();
