import { describe, it, expect } from 'vitest';
import { OpenCashSession } from '../application/cash/OpenCashSession';
import { InMemoryCashSessionRepository } from '../infrastructure/repositories/InMemoryCashSessionRepository';
import { InMemoryCashRegisterRepository } from '../infrastructure/repositories/InMemoryCashRegisterRepository';

describe('AG-13B: Cash User Attribution Contract', () => {
  it('attributes cash session opening to the active operational user', async () => {
    const sessionRepo = new InMemoryCashSessionRepository();
    const registerRepo = new InMemoryCashRegisterRepository();

    const reg = await registerRepo.ensureDefaultRegister('biz-01');

    const openUseCase = new OpenCashSession(sessionRepo, registerRepo);
    const openRes = await openUseCase.execute({
      businessId: 'biz-01',
      cashRegisterId: reg.id,
      openedByUserId: 'usr-maria-456',
      openedByNameSnapshot: 'María Cajera',
      openingAmount: 10000,
      currencyCode: 'USD',
    });

    expect(openRes.success).toBe(true);
    expect(openRes.session?.openedByUserId).toBe('usr-maria-456');
    expect(openRes.session?.openedByNameSnapshot).toBe('María Cajera');
  });
});
