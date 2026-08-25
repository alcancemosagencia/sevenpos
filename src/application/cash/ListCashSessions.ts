import { CashSession } from '../../domain/cash/CashSession';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';

export class ListCashSessions {
  constructor(private sessionRepo: CashSessionRepository) {}

  async execute(
    businessId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ sessions: CashSession[]; total: number }> {
    if (!businessId) return { sessions: [], total: 0 };
    return this.sessionRepo.listSessions(businessId, limit, offset);
  }
}
