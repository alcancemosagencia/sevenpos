import { OperatingExpense, OperatingExpenseWithDetails } from '../OperatingExpense';
import { CashMovement } from '../../cash/CashMovement';

export interface OperatingExpenseRepository {
  findById(businessId: string, id: string): Promise<OperatingExpenseWithDetails | null>;
  findByExpenseNumber(businessId: string, expenseNumber: string): Promise<OperatingExpenseWithDetails | null>;
  findByIdempotencyKey(businessId: string, idempotencyKey: string): Promise<OperatingExpenseWithDetails | null>;
  recordExpenseTransaction(
    expense: OperatingExpense,
    cashMovement?: CashMovement | null
  ): Promise<OperatingExpenseWithDetails>;
}
