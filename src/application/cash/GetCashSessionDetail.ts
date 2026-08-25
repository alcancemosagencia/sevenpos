import { CashSession, CashSessionSummary } from '../../domain/cash/CashSession';
import { CashMovement } from '../../domain/cash/CashMovement';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';
import { CashQueryRepository } from '../../domain/cash/repositories/CashQueryRepository';

export interface CashSessionDetailResult {
  session: CashSession;
  summary: CashSessionSummary | null;
  movements: CashMovement[];
}

export class GetCashSessionDetail {
  constructor(
    private sessionRepo: CashSessionRepository,
    private queryRepo: CashQueryRepository
  ) {}

  async execute(sessionId: string, businessId: string): Promise<CashSessionDetailResult | null> {
    if (!sessionId || !businessId) return null;

    const [session, summary, movements] = await Promise.all([
      this.sessionRepo.getById(sessionId, businessId),
      this.queryRepo.getSessionSummary(sessionId, businessId),
      this.sessionRepo.listMovementsBySession(sessionId, businessId),
    ]);

    if (!session) return null;

    return {
      session,
      summary,
      movements,
    };
  }
}
