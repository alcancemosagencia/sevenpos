import {
  OperatingExpense,
  OperatingExpenseWithDetails,
} from '../../domain/expenses/OperatingExpense';
import { OperatingExpenseRepository } from '../../domain/expenses/repositories/OperatingExpenseRepository';
import { CashMovement } from '../../domain/cash/CashMovement';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';

const STORAGE_KEY_EXPENSES = 'sevenpos-dev-expenses';

export class InMemoryOperatingExpenseRepository implements OperatingExpenseRepository {
  private expenses: OperatingExpense[] = [];

  constructor(private cashSessionRepo?: CashSessionRepository) {
    this.loadFromStorage();
  }

  private hasLocalStorage(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function'
    );
  }

  private loadFromStorage() {
    if (this.hasLocalStorage()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_EXPENSES);
        if (raw) {
          this.expenses = JSON.parse(raw);
        }
      } catch {
        // Fallback
      }
    }
  }

  private saveToStorage() {
    if (this.hasLocalStorage()) {
      try {
        window.localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(this.expenses));
      } catch {
        // Fallback
      }
    }
  }

  async findById(businessId: string, id: string): Promise<OperatingExpenseWithDetails | null> {
    this.loadFromStorage();
    const exp = this.expenses.find((e) => e.businessId === businessId && e.id === id);
    if (!exp) return null;
    return { ...exp };
  }

  async findByExpenseNumber(businessId: string, expenseNumber: string): Promise<OperatingExpenseWithDetails | null> {
    this.loadFromStorage();
    const exp = this.expenses.find((e) => e.businessId === businessId && e.expenseNumber === expenseNumber);
    if (!exp) return null;
    return { ...exp };
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string): Promise<OperatingExpenseWithDetails | null> {
    this.loadFromStorage();
    const exp = this.expenses.find((e) => e.businessId === businessId && e.idempotencyKey === idempotencyKey);
    if (!exp) return null;
    return { ...exp };
  }

  async recordExpenseTransaction(
    expense: OperatingExpense,
    cashMovement?: CashMovement | null
  ): Promise<OperatingExpenseWithDetails> {
    this.loadFromStorage();

    // 1. In-transaction Idempotency Check
    const existing = await this.findByIdempotencyKey(expense.businessId, expense.idempotencyKey);
    if (existing) {
      return existing;
    }

    // 2. Generate Sequence Atomically
    const bizExpenses = this.expenses.filter((e) => e.businessId === expense.businessId);
    const maxSeq = bizExpenses.reduce((max, e) => Math.max(max, e.expenseSequence || 0), 0);
    const nextSeq = maxSeq + 1;
    const expenseNumber = `GTO-${String(nextSeq).padStart(6, '0')}`;

    const toPersist: OperatingExpense = {
      ...expense,
      expenseSequence: nextSeq,
      expenseNumber,
    };

    // 3. Save Cash Movement if Cash Expense
    if (cashMovement && this.cashSessionRepo) {
      await this.cashSessionRepo.addMovement(cashMovement);
    }

    // 4. Save Expense
    this.expenses.push(toPersist);
    this.saveToStorage();

    return { ...toPersist };
  }

  getAllExpenses(): OperatingExpense[] {
    this.loadFromStorage();
    return [...this.expenses];
  }
}

