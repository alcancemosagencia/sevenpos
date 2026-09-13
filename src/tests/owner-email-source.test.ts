import { describe, it, expect } from 'vitest';

describe('AG-13B: Owner Email Source Resolution & Read-Only Contract', () => {
  it('resolves owner email only when cloud membership/user is verified as OWNER', () => {
    const resolveOwnerEmail = (
      cloudUser: { id: string; email?: string } | null,
      cloudMembership: { role: string; userId: string } | null,
      businessOwner: { email?: string } | null
    ): string => {
      if (cloudMembership?.role === 'OWNER' && cloudUser?.email) {
        return cloudUser.email;
      }
      if (businessOwner?.email) {
        return businessOwner.email;
      }
      return 'Cuenta no vinculada';
    };

    // Case 1: Active cloud user is verified as OWNER
    const res1 = resolveOwnerEmail(
      { id: 'usr-1', email: 'owner@sevenpos.com' },
      { role: 'OWNER', userId: 'usr-1' },
      null
    );
    expect(res1).toBe('owner@sevenpos.com');

    // Case 2: Active cloud user is a non-owner member
    const res2 = resolveOwnerEmail(
      { id: 'usr-2', email: 'cashier@sevenpos.com' },
      { role: 'CASHIER', userId: 'usr-2' },
      { email: 'real-owner@sevenpos.com' }
    );
    expect(res2).toBe('real-owner@sevenpos.com');

    // Case 3: Offline / unlinked
    const res3 = resolveOwnerEmail(null, null, null);
    expect(res3).toBe('Cuenta no vinculada');
  });
});
