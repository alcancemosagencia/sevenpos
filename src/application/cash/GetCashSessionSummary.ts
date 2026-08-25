import { CashSessionSummary } from '../../domain/cash/CashSession';
import { CashQueryRepository } from '../../domain/cash/repositories/CashQueryRepository';

export class GetCashSessionSummary {
  constructor(private queryRepo: CashQueryRepository) {}

  async execute(sessionId: string, businessId: string): Promise<CashSessionSummary | null> {
    if (!sessionId || !businessId) return null;
    return this.queryRepo.getSessionSummary(sessionId, businessId);
  }

  async executeActive(businessId: string): Promise<CashSessionSummary | null> {
    if (!businessId) return null;
    return this.queryRepo.getActiveSessionSummary(businessId);
  }
}
