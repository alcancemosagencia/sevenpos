import {
  ExpenseQueryRepository,
  ListExpensesFilter,
  ListExpensesResult,
} from '../../domain/expenses/repositories/ExpenseQueryRepository';
import {
  OperatingExpenseWithDetails,
  ExpenseKpiSummary,
  OperatingExpense,
} from '../../domain/expenses/OperatingExpense';

import { InMemoryOperatingExpenseRepository } from './InMemoryOperatingExpenseRepository';
import { InMemoryExpenseCategoryRepository } from './InMemoryExpenseCategoryRepository';

const STORAGE_KEY_EXPENSES = 'sevenpos-dev-expenses';
const STORAGE_KEY_CATEGORIES = 'sevenpos-dev-expense-categories';

export class InMemoryExpenseQueryRepository implements ExpenseQueryRepository {
  constructor(
    private expenseRepo?: InMemoryOperatingExpenseRepository,
    private categoryRepo?: InMemoryExpenseCategoryRepository
  ) {}

  private hasLocalStorage(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function'
    );
  }

  private loadExpenses(): OperatingExpense[] {
    if (this.expenseRepo) {
      return this.expenseRepo.getAllExpenses();
    }
    if (this.hasLocalStorage()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_EXPENSES);
        if (raw) return JSON.parse(raw);
      } catch {
        return [];
      }
    }
    return [];
  }

  private loadCategories(): { id: string; name: string }[] {
    if (this.categoryRepo) {
      // In-memory categories
      const all = (this.categoryRepo as unknown as { categories?: { id: string; name: string }[] }).categories || [];
      if (all.length > 0) return all;
    }
    if (this.hasLocalStorage()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_CATEGORIES);
        if (raw) return JSON.parse(raw);
      } catch {
        return [];
      }
    }
    return [];
  }

  async list(businessId: string, filter?: ListExpensesFilter): Promise<ListExpensesResult> {
    const all = this.loadExpenses().filter((e) => e.businessId === businessId);
    const categories = this.loadCategories();

    let filtered = all;

    if (filter?.startDate) {
      filtered = filtered.filter((e) => e.expenseDate >= filter.startDate!);
    }
    if (filter?.endDate) {
      filtered = filtered.filter((e) => e.expenseDate <= filter.endDate!);
    }
    if (filter?.categoryId) {
      filtered = filtered.filter((e) => e.categoryId === filter.categoryId);
    }
    if (filter?.paymentMethodCode) {
      filtered = filtered.filter((e) => e.paymentMethodCode === filter.paymentMethodCode);
    }
    if (filter?.supplierId) {
      filtered = filtered.filter((e) => e.supplierId === filter.supplierId);
    }
    if (filter?.search && filter.search.trim().length > 0) {
      const q = filter.search.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.expenseNumber.toLowerCase().includes(q) ||
          e.categoryNameSnapshot.toLowerCase().includes(q) ||
          (e.supplierNameSnapshot && e.supplierNameSnapshot.toLowerCase().includes(q)) ||
          (e.referenceDocument && e.referenceDocument.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => {
      if (a.expenseDate !== b.expenseDate) {
        return b.expenseDate.localeCompare(a.expenseDate);
      }
      return b.expenseSequence - a.expenseSequence;
    });

    const totalCount = filtered.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit !== undefined ? filter.limit : 50;
    const paginated = filtered.slice(offset, offset + limit);

    const withDetails: OperatingExpenseWithDetails[] = paginated.map((e) => {
      const cat = categories.find((c) => c.id === e.categoryId);
      return {
        ...e,
        categoryName: cat?.name || e.categoryNameSnapshot,
      };
    });

    return {
      expenses: withDetails,
      totalCount,
    };
  }

  async getKpiSummary(businessId: string, todayDate: string, monthPrefix: string): Promise<ExpenseKpiSummary> {
    const all = this.loadExpenses().filter((e) => e.businessId === businessId);

    let todayTotal = 0;
    let monthTotal = 0;
    let cashPaidTotal = 0;
    let expensesCount = 0;

    for (const e of all) {
      if (e.expenseDate === todayDate) {
        todayTotal += e.amount;
      }
      if (e.expenseDate.startsWith(monthPrefix)) {
        monthTotal += e.amount;
        expensesCount += 1;
        if (e.paymentMethodCode === 'CASH') {
          cashPaidTotal += e.amount;
        }
      }
    }

    return {
      todayTotal,
      monthTotal,
      cashPaidTotal,
      expensesCount,
    };
  }
}
