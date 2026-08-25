import { SaleItem } from './SaleItem';
import { SalePayment } from './SalePayment';

export type SaleStatus = 'COMPLETED' | 'VOIDED';

export interface Sale {
  id: string;
  businessId: string;
  saleNumber: string;
  saleSequence: number;
  status: SaleStatus;
  customerId?: string | null;
  cashSessionId?: string | null;
  customerNameSnapshot: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currencyCode: string;
  note?: string | null;
  idempotencyKey: string;
  createdByUserId: string;
  createdByNameSnapshot: string;
  createdAt: string;
  completedAt: string;
}

export interface SaleWithDetails {
  sale: Sale;
  items: SaleItem[];
  payments: SalePayment[];
}
