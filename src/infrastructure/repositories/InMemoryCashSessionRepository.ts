import { CashSession } from '../../domain/cash/CashSession';
import { CashMovement } from '../../domain/cash/CashMovement';
import {
  CashSessionRepository,
  OpenSessionParams,
  CloseSessionParams,
} from '../../domain/cash/repositories/CashSessionRepository';
import { calculateExpectedCash } from '../../domain/cash/CashSessionMath';

const DEV_STORAGE_KEY_SESSIONS = 'sevenpos-dev-cash-sessions';
const DEV_STORAGE_KEY_MOVEMENTS = 'sevenpos-dev-cash-movements';

export class InMemoryCashSessionRepository implements CashSessionRepository {
  private sessions: CashSession[] = [];
  private movements: CashMovement[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && typeof window.localStorage.getItem === 'function';
  }

  private loadFromStorage() {
    if (this.hasLocalStorage()) {
      try {
        const rawSessions = window.localStorage.getItem(DEV_STORAGE_KEY_SESSIONS);
        const rawMovements = window.localStorage.getItem(DEV_STORAGE_KEY_MOVEMENTS);
        if (rawSessions) this.sessions = JSON.parse(rawSessions);
        if (rawMovements) this.movements = JSON.parse(rawMovements);
      } catch {
        this.sessions = [];
        this.movements = [];
      }
    }
  }

  private saveToStorage() {
    if (this.hasLocalStorage()) {
      window.localStorage.setItem(DEV_STORAGE_KEY_SESSIONS, JSON.stringify(this.sessions));
      window.localStorage.setItem(DEV_STORAGE_KEY_MOVEMENTS, JSON.stringify(this.movements));
    }
  }

  async getActiveSession(businessId: string, cashRegisterId?: string): Promise<CashSession | null> {
    this.loadFromStorage();
    const session = this.sessions.find(
      (s) =>
        s.businessId === businessId &&
        s.status === 'OPEN' &&
        (!cashRegisterId || s.cashRegisterId === cashRegisterId)
    );
    return session ? { ...session } : null;
  }

  async getById(id: string, businessId: string): Promise<CashSession | null> {
    this.loadFromStorage();
    const session = this.sessions.find((s) => s.id === id && s.businessId === businessId);
    return session ? { ...session } : null;
  }

  async getLastSession(businessId: string, cashRegisterId?: string): Promise<CashSession | null> {
    this.loadFromStorage();
    const filtered = this.sessions
      .filter(
        (s) =>
          s.businessId === businessId &&
          (!cashRegisterId || s.cashRegisterId === cashRegisterId)
      )
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
    return filtered.length > 0 ? { ...filtered[0] } : null;
  }

  async listSessions(
    businessId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ sessions: CashSession[]; total: number }> {
    this.loadFromStorage();
    const filtered = this.sessions
      .filter((s) => s.businessId === businessId)
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit).map((s) => ({ ...s }));
    return { sessions: paginated, total };
  }

  async openSession(params: OpenSessionParams): Promise<CashSession> {
    this.loadFromStorage();
    // Invariant check: cannot open if another session for same register is open
    const existing = this.sessions.find(
      (s) =>
        s.businessId === params.session.businessId &&
        s.cashRegisterId === params.session.cashRegisterId &&
        s.status === 'OPEN'
    );
    if (existing) {
      throw new Error('uq_active_cash_session_per_register: Ya existe una sesión abierta para esta caja.');
    }

    this.sessions.push({ ...params.session });
    this.movements.push({ ...params.initialMovement });
    this.saveToStorage();

    return { ...params.session };
  }

  async closeSession(params: CloseSessionParams): Promise<CashSession> {
    this.loadFromStorage();
    const idx = this.sessions.findIndex(
      (s) => s.id === params.sessionId && s.businessId === params.businessId
    );
    if (idx === -1) {
      throw new Error('Sesión de caja no encontrada.');
    }

    const current = this.sessions[idx];
    if (current.status !== 'OPEN') {
      throw new Error('La sesión de caja ya se encuentra cerrada.');
    }

    const updated: CashSession = {
      ...current,
      status: 'CLOSED',
      closedByUserId: params.closedByUserId,
      closedByNameSnapshot: params.closedByNameSnapshot,
      closedAt: params.closedAt,
      expectedCashAmount: params.expectedCashAmount,
      countedCashAmount: params.countedCashAmount,
      differenceAmount: params.differenceAmount,
      closingNote: params.closingNote || null,
      updatedAt: params.closedAt,
    };

    this.sessions[idx] = updated;
    this.saveToStorage();

    return { ...updated };
  }

  async addMovement(movement: CashMovement): Promise<CashMovement> {
    this.loadFromStorage();
    // Unique check for SALE_CASH
    if (movement.referenceType === 'SALE' && movement.movementType === 'SALE_CASH') {
      const duplicate = this.movements.find(
        (m) =>
          m.businessId === movement.businessId &&
          m.referenceId === movement.referenceId &&
          m.movementType === 'SALE_CASH'
      );
      if (duplicate) {
        return { ...duplicate };
      }
    }

    this.movements.push({ ...movement });
    this.saveToStorage();
    return { ...movement };
  }

  async listMovementsBySession(sessionId: string, businessId: string): Promise<CashMovement[]> {
    this.loadFromStorage();
    return this.movements
      .filter((m) => m.cashSessionId === sessionId && m.businessId === businessId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((m) => ({ ...m }));
  }

  async getExpectedCashForSession(sessionId: string, businessId: string): Promise<number> {
    const sessionMovements = await this.listMovementsBySession(sessionId, businessId);
    return calculateExpectedCash(sessionMovements);
  }
}
