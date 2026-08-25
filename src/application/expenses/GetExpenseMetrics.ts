import { ExpenseKpiSummary } from '../../domain/expenses/OperatingExpense';
import { ExpenseQueryRepository } from '../../domain/expenses/repositories/ExpenseQueryRepository';

export class GetExpenseMetrics {
  constructor(private queryRepo: ExpenseQueryRepository) {}

  async execute(businessId: string, todayDate: string, monthPrefix: string): Promise<ExpenseKpiSummary> {
    if (!businessId) {
      return {
        todayTotal: 0,
        monthTotal: 0,
        cashPaidTotal: 0,
        expensesCount: 0,
      };
    }
    return this.queryRepo.getKpiSummary(businessId, todayDate, monthPrefix);
  }
}
