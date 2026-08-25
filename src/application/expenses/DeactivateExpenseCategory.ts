import { ExpenseCategory } from '../../domain/expenses/ExpenseCategory';
import { ExpenseCategoryRepository } from '../../domain/expenses/repositories/ExpenseCategoryRepository';

export class DeactivateExpenseCategory {
  constructor(private categoryRepo: ExpenseCategoryRepository) {}

  async execute(businessId: string, id: string): Promise<ExpenseCategory> {
    if (!businessId || !id) {
      throw new Error('INVALID_ARGUMENTS: Identificadores requeridos.');
    }

    const current = await this.categoryRepo.findById(businessId, id);
    if (!current) {
      throw new Error('EXPENSE_CATEGORY_NOT_FOUND: La categoría especificada no existe.');
    }

    return this.categoryRepo.update(businessId, id, { active: false });
  }
}
