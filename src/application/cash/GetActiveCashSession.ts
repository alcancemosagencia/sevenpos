import { CashSession } from '../../domain/cash/CashSession';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';

export class GetActiveCashSession {
  constructor(private sessionRepo: CashSessionRepository) {}

  async execute(businessId: string, cashRegisterId?: string): Promise<CashSession | null> {
    if (!businessId) return null;
    return this.sessionRepo.getActiveSession(businessId, cashRegisterId);
  }
}
