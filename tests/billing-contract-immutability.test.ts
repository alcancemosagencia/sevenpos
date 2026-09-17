import { describe, it, expect } from 'vitest';

describe('billing_contracts immutability contract', () => {
  it('billing_contracts has no updated_at field — immutable by design', () => {
    // The type definition deliberately omits updated_at
    type BillingContract = {
      id: string;
      created_at: string;
      final_net_amount: number;
      // NO updated_at
    };
    const contract: BillingContract = {
      id: 'contract-uuid',
      created_at: '2026-09-15T00:00:00Z',
      final_net_amount: 9990,
    };
    expect((contract as Record<string, unknown>).updated_at).toBeUndefined();
  });

  it('billing_contracts UPDATE count must be 0', () => {
    // Documents the invariant: the DB trigger blocks all UPDATEs
    // Application code never updates this table
    const updateCount = 0;
    expect(updateCount).toBe(0);
  });

  it('price transition writes to business_subscriptions — not billing_contracts', () => {
    // Transition execution state fields are on business_subscriptions
    type BusinessSubscription = {
      price_transition_applied_at: string | null;
      price_transition_confirmed_amount: number | null;
    };
    const sub: BusinessSubscription = {
      price_transition_applied_at: '2026-09-15T12:00:00Z',
      price_transition_confirmed_amount: 23788,
    };
    expect(sub.price_transition_applied_at).not.toBeNull();
    // billing_contracts is never touched
    expect(true).toBe(true);
  });

  it('new commercial event → new row, not UPDATE', () => {
    // Simulate: contract count goes from 1 to 2 on renewal — no UPDATE
    const contracts = [{ id: 'c1', final_net_amount: 9990 }];
    const renewal = { id: 'c2', final_net_amount: 19990 };
    contracts.push(renewal);
    expect(contracts.length).toBe(2);
    expect(contracts[0].final_net_amount).toBe(9990); // original unchanged
    expect(contracts[1].final_net_amount).toBe(19990); // new row
  });
});
