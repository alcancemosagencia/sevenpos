import { CashSessionSummary } from '../CashSession';

export interface CashQueryRepository {
  getSessionSummary(sessionId: string, businessId: string): Promise<CashSessionSummary | null>;
  getActiveSessionSummary(businessId: string): Promise<CashSessionSummary | null>;
}
