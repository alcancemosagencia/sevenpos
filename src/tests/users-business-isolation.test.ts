import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { PinVault } from '../domain/auth/PinVault';

class MockPinVault implements PinVault {
  private pins = new Map<string, string>();
  async savePinCredential(userId: string, pin: string): Promise<void> { this.pins.set(userId, pin); }
  async verifyPin(userId: string, pin: string): Promise<boolean> { return this.pins.get(userId) === pin; }
  async hasPinCredential(userId: string): Promise<boolean> { return this.pins.has(userId); }
  async removePinCredential(userId: string): Promise<void> { this.pins.delete(userId); }
  async resetVault(): Promise<void> { this.pins.clear(); }
}

describe('AG-13B: Multi-tenant User Business Isolation', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: MockPinVault;
  let userService: OperationalUserService;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    pinVault = new MockPinVault();
    userService = new OperationalUserService(userRepo, pinVault);
  });

  it('prohibits PIN collision across different users in the same business, but allows duplicate PINs in different businesses', async () => {
    // User 1 in biz-A
    const u1 = await userService.createUser({
      businessId: 'biz-A',
      fullName: 'Alice',
      role: 'CASHIER',
      pin: '4321',
    });
    expect(u1.success).toBe(true);

    // User 2 in biz-A with same PIN should fail
    const u2 = await userService.createUser({
      businessId: 'biz-A',
      fullName: 'Bob',
      role: 'CASHIER',
      pin: '4321',
    });
    expect(u2.success).toBe(false);
    expect(u2.error).toContain('PIN');

    // User 3 in biz-B with same PIN should succeed (cross-tenant isolation)
    const u3 = await userService.createUser({
      businessId: 'biz-B',
      fullName: 'Charlie',
      role: 'CASHIER',
      pin: '4321',
    });
    expect(u3.success).toBe(true);
  });
});
