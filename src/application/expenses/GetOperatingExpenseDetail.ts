import { OperatingExpenseWithDetails } from '../../domain/expenses/OperatingExpense';
import { OperatingExpenseRepository } from '../../domain/expenses/repositories/OperatingExpenseRepository';

export class GetOperatingExpenseDetail {
  constructor(private expenseRepo: OperatingExpenseRepository) {}

  async execute(businessId: string, id: string): Promise<OperatingExpenseWithDetails | null> {
    if (!businessId || !id) return null;
    return this.expenseRepo.findById(businessId, id);
  }
}
