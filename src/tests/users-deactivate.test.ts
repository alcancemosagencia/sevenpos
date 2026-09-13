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

describe('AG-13B: User Deactivate and Reactivate Lifecycle', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: MockPinVault;
  let userService: OperationalUserService;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    pinVault = new MockPinVault();
    userService = new OperationalUserService(userRepo, pinVault);
  });

  it('deactivates and reactivates a cashier user', async () => {
    const ownerRes = await userService.createUser(
      { businessId: 'biz-01', fullName: 'Owner', role: 'OWNER', pin: '1111' }
    );
    const ownerUser = ownerRes.user!;

    const cashierRes = await userService.createUser(
      { businessId: 'biz-01', fullName: 'Cashier', role: 'CASHIER', pin: '2222' },
      ownerUser
    );
    const cashierId = cashierRes.user!.id;

    // Deactivate
    const deactRes = await userService.deactivateUser(cashierId, ownerUser);
    expect(deactRes.success).toBe(true);

    const activeUsersAfterDeact = await userService.getActiveUsers('biz-01');
    expect(activeUsersAfterDeact.find((u) => u.id === cashierId)).toBeUndefined();

    // Reactivate
    const reactRes = await userService.reactivateUser(cashierId, ownerUser, '3333');
    expect(reactRes.success).toBe(true);

    const activeUsersAfterReact = await userService.getActiveUsers('biz-01');
    expect(activeUsersAfterReact.find((u) => u.id === cashierId)).toBeDefined();
  });
});
