import { OperatingExpenseWithDetails, ExpenseKpiSummary } from '../OperatingExpense';
import { ExpensePaymentMethod } from '../ExpensePaymentMethod';

export interface ListExpensesFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  categoryId?: string;
  paymentMethodCode?: ExpensePaymentMethod;
  supplierId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListExpensesResult {
  expenses: OperatingExpenseWithDetails[];
  totalCount: number;
}

export interface ExpenseQueryRepository {
  list(businessId: string, filter?: ListExpensesFilter): Promise<ListExpensesResult>;
  getKpiSummary(businessId: string, todayDate: string, monthPrefix: string): Promise<ExpenseKpiSummary>;
}
