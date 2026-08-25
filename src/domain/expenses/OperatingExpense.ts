import { CurrencyCode } from '../../types/country';
import { ExpensePaymentMethod } from './ExpensePaymentMethod';

export type ExpenseStatus = 'RECORDED';

export interface OperatingExpense {
  id: string;
  businessId: string;
  expenseNumber: string; // 'GTO-000001'
  expenseSequence: number;
  categoryId: string;
  categoryNameSnapshot: string;
  description: string;
  amount: number; // Integer minor units (strictly positive)
  currencyCode: CurrencyCode;
  paymentMethodCode: ExpensePaymentMethod;
  expenseDate: string; // YYYY-MM-DD
  supplierId: string | null;
  supplierNameSnapshot: string | null;
  cashSessionId: string | null;
  cashMovementId: string | null;
  referenceDocument: string | null;
  note: string | null;
  status: ExpenseStatus;
  idempotencyKey: string;
  createdByUserId: string;
  createdByNameSnapshot: string;
  createdAt: string; // UTC ISO
  updatedAt: string; // UTC ISO
}

export interface OperatingExpenseWithDetails extends OperatingExpense {
  categoryName?: string;
  supplierName?: string | null;
  cashRegisterName?: string | null;
}

export interface RecordOperatingExpenseDto {
  categoryId: string;
  description: string;
  amount: number; // Integer in minor units
  currencyCode: CurrencyCode;
  paymentMethodCode: ExpensePaymentMethod;
  expenseDate: string; // YYYY-MM-DD
  cashRegisterId?: string | null; // Intended cash register if CASH
  supplierId?: string | null;
  referenceDocument?: string | null;
  note?: string | null;
  idempotencyKey: string;
}

export interface ExpenseKpiSummary {
  todayTotal: number;
  monthTotal: number;
  cashPaidTotal: number;
  expensesCount: number;
}
