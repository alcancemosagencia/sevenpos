import { ExpenseCategory } from '../../domain/expenses/ExpenseCategory';
import { ExpenseCategoryRepository } from '../../domain/expenses/repositories/ExpenseCategoryRepository';

export class ListExpenseCategories {
  constructor(private categoryRepo: ExpenseCategoryRepository) {}

  async execute(businessId: string, includeInactive: boolean = false): Promise<ExpenseCategory[]> {
    if (!businessId) return [];
    return this.categoryRepo.list(businessId, includeInactive);
  }
}
