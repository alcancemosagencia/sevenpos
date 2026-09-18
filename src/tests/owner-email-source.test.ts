import { describe, it, expect } from 'vitest';

describe('AG-15D-02: Owner Email Source Resolution & Read-Only Contract', () => {
  const resolveOwnerEmail = (
    cloudUser: { id: string; email?: string } | null,
    cloudMembership: { role: string; userId: string } | null,
    deviceEnrollment: { accountEmail?: string } | null,
    businessOwner: { email?: string } | null
  ): string | null => {
    if (cloudMembership?.role === 'OWNER' && cloudUser?.email) {
      return cloudUser.email;
    }
    if (cloudUser?.email) {
      return cloudUser.email;
    }
    if (deviceEnrollment?.accountEmail && deviceEnrollment.accountEmail.trim().length > 0) {
      return deviceEnrollment.accountEmail;
    }
    if (businessOwner?.email && businessOwner.email.trim().length > 0) {
      return businessOwner.email;
    }
    return null;
  };

  const resolveAccountDisplay = (
    ownerEmail: string | null,
    isCloudLinked: boolean
  ): string => {
    if (ownerEmail) return ownerEmail;
    if (isCloudLinked) return 'Cuenta vinculada';
    return 'Cuenta no vinculada';
  };

  it('resolves active cloud user verified as OWNER', () => {
    const email = resolveOwnerEmail(
      { id: 'usr-1', email: 'owner@sevenpos.com' },
      { role: 'OWNER', userId: 'usr-1' },
      null,
      null
    );
    expect(email).toBe('owner@sevenpos.com');
    expect(resolveAccountDisplay(email, true)).toBe('owner@sevenpos.com');
  });

  it('resolves device enrollment accountEmail when cloud session is not active', () => {
    const email = resolveOwnerEmail(
      null,
      null,
      { accountEmail: 'alcancemosagencia@gmail.com' },
      null
    );
    expect(email).toBe('alcancemosagencia@gmail.com');
    expect(resolveAccountDisplay(email, true)).toBe('alcancemosagencia@gmail.com');
  });

  it('resolves local business owner email if enrollment is absent but state has email', () => {
    const email = resolveOwnerEmail(
      null,
      null,
      null,
      { email: 'local-owner@sevenpos.com' }
    );
    expect(email).toBe('local-owner@sevenpos.com');
    expect(resolveAccountDisplay(email, false)).toBe('local-owner@sevenpos.com');
  });

  it('shows Cuenta vinculada when linked but no email is available', () => {
    const email = resolveOwnerEmail(null, null, null, null);
    expect(email).toBeNull();
    expect(resolveAccountDisplay(email, true)).toBe('Cuenta vinculada');
  });

  it('shows Cuenta no vinculada only when truly unlinked', () => {
    const email = resolveOwnerEmail(null, null, null, null);
    expect(email).toBeNull();
    expect(resolveAccountDisplay(email, false)).toBe('Cuenta no vinculada');
  });
});
