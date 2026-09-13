import { describe, it, expect } from 'vitest';
import { InMemorySaleRepository } from '../infrastructure/repositories/InMemorySaleRepository';
import { Sale } from '../domain/sales/Sale';

describe('AG-13B: Sale User Attribution Contract', () => {
  it('records the active operator createdByUserId and createdByNameSnapshot accurately in sale transaction', async () => {
    const saleRepo = new InMemorySaleRepository();

    const sale: Sale = {
      id: 'sale-001',
      businessId: 'biz-01',
      saleNumber: 'VTA-000001',
      saleSequence: 1,
      createdByUserId: 'usr-carlos-123',
      createdByNameSnapshot: 'Carlos Cajero',
      cashSessionId: null,
      subtotal: 2000,
      discountTotal: 0,
      taxTotal: 0,
      total: 2000,
      currencyCode: 'USD',
      status: 'COMPLETED',
      customerId: null,
      customerNameSnapshot: 'Consumidor final',
      note: null,
      idempotencyKey: 'idem-001',
      createdAt: '2026-09-01T00:00:00Z',
      completedAt: '2026-09-01T00:00:00Z',
    };

    const created = await saleRepo.createSaleTransaction(sale, [], [], []);

    expect(created.sale.createdByUserId).toBe('usr-carlos-123');
    expect(created.sale.createdByNameSnapshot).toBe('Carlos Cajero');
  });
});
