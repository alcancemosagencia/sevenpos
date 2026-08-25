import { ExpenseCategoryRepository } from '../../domain/expenses/repositories/ExpenseCategoryRepository';

export class EnsureDefaultExpenseCategories {
  constructor(private categoryRepo: ExpenseCategoryRepository) {}

  async execute(businessId: string): Promise<void> {
    if (!businessId) return;
    await this.categoryRepo.ensureDefaults(businessId);
  }
}
