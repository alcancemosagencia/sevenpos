export type CashSessionStatus = 'OPEN' | 'CLOSED';

export interface CashSession {
  id: string;
  businessId: string;
  cashRegisterId: string;
  openedByUserId: string;
  openedByNameSnapshot: string;
  openedAt: string;
  openingAmount: number; // Stored in minor currency units (audit snapshot)
  status: CashSessionStatus;
  closedByUserId?: string | null;
  closedByNameSnapshot?: string | null;
  closedAt?: string | null;
  expectedCashAmount?: number | null; // Stored in minor units
  countedCashAmount?: number | null; // Stored in minor units
  differenceAmount?: number | null; // counted - expected (minor units)
  closingNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CashSessionSummary {
  session: CashSession;
  registerName: string;
  openingAmount: number;
  totalSaleCash: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  ticketCount: number;
  totalSalesAmount: number;
  electronicSalesAmount: number;
  movementCount: number;
}
