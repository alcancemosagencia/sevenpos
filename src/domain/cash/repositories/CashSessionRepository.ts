import { CashSession } from '../CashSession';
import { CashMovement } from '../CashMovement';

export interface OpenSessionParams {
  session: CashSession;
  initialMovement: CashMovement;
}

export interface CloseSessionParams {
  sessionId: string;
  businessId: string;
  closedByUserId: string;
  closedByNameSnapshot: string;
  closedAt: string;
  expectedCashAmount: number;
  countedCashAmount: number;
  differenceAmount: number;
  closingNote?: string | null;
}

export interface CashSessionRepository {
  getActiveSession(businessId: string, cashRegisterId?: string): Promise<CashSession | null>;
  getById(id: string, businessId: string): Promise<CashSession | null>;
  getLastSession(businessId: string, cashRegisterId?: string): Promise<CashSession | null>;
  listSessions(businessId: string, limit?: number, offset?: number): Promise<{ sessions: CashSession[]; total: number }>;
  openSession(params: OpenSessionParams): Promise<CashSession>;
  closeSession(params: CloseSessionParams): Promise<CashSession>;
  addMovement(movement: CashMovement): Promise<CashMovement>;
  listMovementsBySession(sessionId: string, businessId: string): Promise<CashMovement[]>;
  getExpectedCashForSession(sessionId: string, businessId: string): Promise<number>;
}
