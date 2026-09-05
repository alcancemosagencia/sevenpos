export type DateRangePreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  fromUtc: string;   // ISO string UTC start (inclusive)
  toUtc: string;     // ISO string UTC end (inclusive end of period)
  label: string;
}

export interface ComparisonPeriod {
  fromUtc: string;
  toUtc: string;
  label: string;
}

export interface MetricDelta {
  current: number;
  previous: number;
  absoluteDelta: number;
  percentageDelta: number | null; // null if previous === 0
  trend: 'UP' | 'DOWN' | 'FLAT';
}

export interface ExecutiveSummaryMetrics {
  totalSales: MetricDelta;
  ticketCount: MetricDelta;
  averageTicket: MetricDelta;
  knownGrossProfit: number;
  costCoveragePercent: number;
  costQuality: 'COMPLETE' | 'PARTIAL' | 'NONE';
  operatingExpenses: MetricDelta;
  canShowGlobalOperatingResult: boolean; // true ONLY if costCoveragePercent === 100
  estimatedOperatingResult: number | null; // Net Sales - Known Cost - Expenses (only if 100% coverage)
  knownOperatingResult: number; // For disclosure when < 100%
  receivedPurchasesTotal: number;
  openOrdersCount: number;
  openOrdersTotal: number;
  cashNetDifference: number;
  cashAbsoluteVariance: number;
  cashSessionsWithDifferenceCount: number;
  cashClosedSessionsCount: number;
  totalProductsWithStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
}

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "01 Sep"
  sales: number;
  ticketCount: number;
  previousSales?: number;
}

export interface HourlySalesPoint {
  hour: number;
  label: string;
  totalSales: number;
  ticketCount: number;
}

export interface TopProductAnalytics {
  productId: string;
  productName: string;
  categoryName: string;
  baseUnit: string;
  quantitySold: number; // scaled to major unit (e.g. 5.5 kg or 10 units)
  totalRevenue: number;
  revenuePercentOfTotal: number;
  ticketCount: number;
  estimatedCost: number | null;
  grossProfit: number | null;
}

export interface PaymentMethodBreakdown {
  code: string;
  name: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface CategorySalesBreakdown {
  categoryId: string;
  categoryName: string;
  color?: string;
  totalRevenue: number;
  itemCount: number;
  percentage: number;
}

export interface SaleDetailRow {
  id: string;
  saleNumber: string;
  completedAt: string;
  customerName: string;
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethods: string;
}

export interface SalesAnalyticsView {
  summary: {
    totalSales: number;
    ticketCount: number;
    averageTicket: number;
    totalDiscount: number;
    knownGrossProfit: number;
    costCoveragePercent: number;
    linesWithCostCount: number;
    totalLinesCount: number;
  };
  timeSeries: TimeSeriesPoint[];
  hourlyDistribution: HourlySalesPoint[];
  topProducts: TopProductAnalytics[];
  paymentBreakdown: PaymentMethodBreakdown[];
  categoryBreakdown: CategorySalesBreakdown[];
  recentSales: SaleDetailRow[];
}

export interface InventoryAnalyticsView {
  kpis: {
    totalProducts: number;
    productsWithStock: number;
    lowStockCount: number;
    outOfStockCount: number;
    estimatedInventoryValue: number;
    receivedPurchasesPeriod: number;
    openOrdersCount: number;
    openOrdersTotal: number;
  };
  lowStockItems: {
    productId: string;
    productName: string;
    categoryName: string;
    currentStock: number;
    minimumStock: number;
    deficit: number;
    unitCost: number | null;
    estimatedDeficitCost: number | null;
  }[];
  inventoryByCategory: {
    categoryName: string;
    productCount: number;
    stockValue: number;
    percentage: number;
  }[];
  receivedReceipts: {
    receiptId: string;
    receiptNumber: string;
    receivedAt: string;
    orderNumber: string;
    supplierName: string;
    itemCount: number;
    totalCost: number;
  }[];
  openOrders: {
    orderId: string;
    orderNumber: string;
    supplierName: string;
    status: string;
    createdAt: string;
    expectedDate: string | null;
    total: number;
  }[];
}

export interface CashSessionAuditRow {
  sessionId: string;
  registerName: string;
  openedByName: string;
  closedByName: string;
  openedAt: string;
  closedAt: string | null;
  initialCashAmount: number;
  expectedCashAmount: number;
  countedCashAmount: number | null;
  differenceAmount: number;
  status: 'OPEN' | 'CLOSED';
}

export interface FinancialAnalyticsView {
  pnl: {
    netSales: number;
    knownCostOfGoodsSold: number;
    knownGrossProfit: number;
    costCoveragePercent: number;
    isFullyCosted: boolean;
    operatingExpensesTotal: number;
    canShowOperatingResult: boolean;
    estimatedOperatingResult: number | null;
    knownOperatingResult: number;
    receivedPurchasesTotal: number;
  };
  expensesByCategory: {
    categoryId: string;
    categoryName: string;
    totalAmount: number;
    percentage: number;
    expenseCount: number;
  }[];
  expensesByPaymentMethod: {
    methodCode: string;
    totalAmount: number;
    percentage: number;
  }[];
  cashAudit: {
    totalClosedSessions: number;
    sessionsWithDiscrepancyCount: number;
    netCashDifference: number;
    absoluteCashVariance: number;
    sessions: CashSessionAuditRow[];
  };
}

export interface CustomerAnalyticsView {
  kpis: {
    totalCustomers: number;
    activeCustomersInPeriod: number;
    salesIdentifiedTotal: number;
    salesAnonymousTotal: number;
    customerIdentificationRate: number; // %
    topCustomerName: string | null;
    topCustomerSpend: number;
  };
  topCustomers: {
    customerId: string;
    name: string;
    phone: string | null;
    email: string | null;
    totalSpentInPeriod: number;
    ticketCountInPeriod: number;
    averageTicket: number;
    lastPurchaseDate: string | null;
  }[];
  salesSplit: {
    identifiedRevenue: number;
    identifiedTickets: number;
    anonymousRevenue: number;
    anonymousTickets: number;
  };
}

export type ExportReportType =
  | 'SALES_SUMMARY'
  | 'SALES_LIST'
  | 'TOP_PRODUCTS'
  | 'INVENTORY_STOCK'
  | 'OPERATING_EXPENSES'
  | 'CASH_SESSIONS_AUDIT';
