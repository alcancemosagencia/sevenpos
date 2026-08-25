import { CurrencyCode } from '../../types/country';

export type CashMovementType = 'OPENING' | 'SALE_CASH' | 'CASH_IN' | 'CASH_OUT';
export type CashMovementReferenceType = 'SALE' | 'USER' | 'SESSION' | 'OPERATING_EXPENSE';

export interface CashMovement {
  id: string;
  businessId: string;
  cashSessionId: string;
  cashRegisterId: string;
  movementType: CashMovementType;
  amount: number; // Strictly positive integer in minor units
  currencyCode: CurrencyCode;
  reason: string;
  note?: string | null;
  referenceType?: CashMovementReferenceType | null;
  referenceId?: string | null;
  createdByUserId: string;
  createdByNameSnapshot: string;
  createdAt: string;
}
