import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { PinVault } from '../domain/auth/PinVault';
import { pinLockoutManager } from '../domain/auth/PinLockoutManager';

class MockPinVault implements PinVault {
  private pins = new Map<string, string>();
  async savePinCredential(userId: string, pin: string): Promise<void> { this.pins.set(userId, pin); }
  async verifyPin(userId: string, pin: string): Promise<boolean> { return this.pins.get(userId) === pin; }
  async hasPinCredential(userId: string): Promise<boolean> { return this.pins.has(userId); }
  async removePinCredential(userId: string): Promise<void> { this.pins.delete(userId); }
  async resetVault(): Promise<void> { this.pins.clear(); }
}

describe('AG-13B: Operator PIN Brute-Force Rate Limiting', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: MockPinVault;
  let userService: OperationalUserService;
  let cashierId: string;

  beforeEach(async () => {
    pinLockoutManager.reset();
    userRepo = new InMemoryUserRepository();
    pinVault = new MockPinVault();
    userService = new OperationalUserService(userRepo, pinVault);

    const c = await userService.createUser({
      businessId: 'biz-01',
      fullName: 'Operator 1',
      role: 'CASHIER',
      pin: '1234',
    });
    cashierId = c.user!.id;
  });

  it('triggers 30-second temporary lockout after 5 consecutive failed attempts', async () => {
    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const res = await userService.verifyUserPin('biz-01', cashierId, '0000');
      expect(res.success).toBe(false);
      expect(res.isLockedOut).toBeFalsy();
    }

    // 5th failed attempt -> locks out
    const fifth = await userService.verifyUserPin('biz-01', cashierId, '0000');
    expect(fifth.success).toBe(false);
    expect(fifth.isLockedOut).toBe(true);
    expect(fifth.remainingSeconds).toBeGreaterThan(0);
    expect(fifth.error).toContain('bloqueado');

    // 6th attempt (even with correct PIN) should be rejected immediately due to lockout
    const correctWhileLocked = await userService.verifyUserPin('biz-01', cashierId, '1234');
    expect(correctWhileLocked.success).toBe(false);
    expect(correctWhileLocked.isLockedOut).toBe(true);
  });
});
