import { Sale, SaleWithDetails } from '../Sale';
import { SaleItem } from '../SaleItem';
import { SalePayment } from '../SalePayment';
import { InventoryMovement } from '../../inventory/InventoryMovement';

export interface ListSalesOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface SalesPeriodSummary {
  totalSales: number;
  ticketCount: number;
  totalDiscount: number;
  profitMinor: number | null; // null if any item in period lacks REAL cost snapshot
  profitQuality: 'COMPLETE' | 'INCOMPLETE';
}

export interface HourlySalesPoint {
  hour: number; // 0..23
  label: string; // "08:00", etc.
  totalSales: number;
  ticketCount: number;
}

export interface TopSellingProductRow {
  productId: string;
  productName: string;
  baseUnit: string;
  totalQuantityMajor: number;
  totalRevenue: number;
  transactionCount: number;
}

export interface SaleRepository {
  /**
   * Executes atomic insertion of Sale, SaleItems, SalePayments, and InventoryMovements.
   */
  createSaleTransaction(
    sale: Sale,
    items: SaleItem[],
    payments: SalePayment[],
    movements: InventoryMovement[],
    cashMovement?: import('../../cash/CashMovement').CashMovement | null
  ): Promise<SaleWithDetails>;

  getSaleById(id: string): Promise<SaleWithDetails | null>;

  getSaleByIdempotencyKey(businessId: string, idempotencyKey: string): Promise<SaleWithDetails | null>;

  getNextSaleSequence(businessId: string): Promise<{ sequence: number; saleNumber: string }>;

  listSales(businessId: string, options?: ListSalesOptions): Promise<Sale[]>;

  countSales(businessId: string): Promise<number>;

  getSalesSummary(businessId: string, fromUtc: string, toUtc: string): Promise<SalesPeriodSummary>;

  getHourlySales(businessId: string, fromUtc: string, toUtc: string): Promise<HourlySalesPoint[]>;

  getTopSellingProducts(businessId: string, fromUtc: string, toUtc: string, limit?: number): Promise<TopSellingProductRow[]>;
}
