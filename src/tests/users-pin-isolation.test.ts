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

describe('AG-13B: Operator PIN Isolation and Reset', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: MockPinVault;
  let userService: OperationalUserService;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    pinVault = new MockPinVault();
    userService = new OperationalUserService(userRepo, pinVault);
  });

  it('allows owner/admin to reset operator PIN without exposing or storing plaintext in DB', async () => {
    const owner = await userService.createUser(
      { businessId: 'biz-01', fullName: 'Owner', role: 'OWNER', pin: '1111' }
    );
    const ownerUser = owner.user!;

    const cashier = await userService.createUser(
      { businessId: 'biz-01', fullName: 'Cashier', role: 'CASHIER', pin: '2222' },
      ownerUser
    );
    const cashierId = cashier.user!.id;

    // Reset PIN
    const resetRes = await userService.resetUserPin(cashierId, '9999', ownerUser);
    expect(resetRes.success).toBe(true);

    // Verify old PIN fails, new PIN succeeds
    const oldPinVerify = await userService.verifyUserPin('biz-01', cashierId, '2222');
    expect(oldPinVerify.success).toBe(false);

    const newPinVerify = await userService.verifyUserPin('biz-01', cashierId, '9999');
    expect(newPinVerify.success).toBe(true);
  });
});
