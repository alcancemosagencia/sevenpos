import { CashSessionSummary } from '../../domain/cash/CashSession';
import { CashQueryRepository } from '../../domain/cash/repositories/CashQueryRepository';
import { CashSessionRepository } from '../../domain/cash/repositories/CashSessionRepository';
import { CashRegisterRepository } from '../../domain/cash/repositories/CashRegisterRepository';
import { SaleRepository } from '../../domain/sales/repositories/SaleRepository';

export class InMemoryCashQueryRepository implements CashQueryRepository {
  constructor(
    private sessionRepo: CashSessionRepository,
    private registerRepo: CashRegisterRepository,
    private saleRepo: SaleRepository
  ) {}

  async getSessionSummary(sessionId: string, businessId: string): Promise<CashSessionSummary | null> {
    const session = await this.sessionRepo.getById(sessionId, businessId);
    if (!session) return null;

    const [register, movements, allSales] = await Promise.all([
      this.registerRepo.getById(session.cashRegisterId, businessId),
      this.sessionRepo.listMovementsBySession(sessionId, businessId),
      this.saleRepo.listSales(businessId),
    ]);

    let totalOpening = 0;
    let totalSaleCash = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;

    for (const m of movements) {
      if (m.movementType === 'OPENING') totalOpening += m.amount;
      else if (m.movementType === 'SALE_CASH') totalSaleCash += m.amount;
      else if (m.movementType === 'CASH_IN') totalCashIn += m.amount;
      else if (m.movementType === 'CASH_OUT') totalCashOut += m.amount;
    }

    const expectedCash = totalOpening + totalSaleCash + totalCashIn - totalCashOut;

    // Filter sales belonging to this session
    const sessionSales = allSales.filter((s) => s.cashSessionId === sessionId && s.status === 'COMPLETED');
    const ticketCount = sessionSales.length;
    const totalSalesAmount = sessionSales.reduce((acc, s) => acc + s.total, 0);
    const electronicSalesAmount = Math.max(0, totalSalesAmount - totalSaleCash);

    return {
      session,
      registerName: register?.name || 'Caja principal',
      openingAmount: session.openingAmount,
      totalSaleCash,
      totalCashIn,
      totalCashOut,
      expectedCash,
      ticketCount,
      totalSalesAmount,
      electronicSalesAmount,
      movementCount: movements.length,
    };
  }

  async getActiveSessionSummary(businessId: string): Promise<CashSessionSummary | null> {
    const active = await this.sessionRepo.getActiveSession(businessId);
    if (!active) return null;
    return this.getSessionSummary(active.id, businessId);
  }
}
