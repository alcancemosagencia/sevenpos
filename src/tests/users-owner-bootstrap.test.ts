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

describe('AG-13B: Users Owner Bootstrap & Invariants', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: MockPinVault;
  let userService: OperationalUserService;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    pinVault = new MockPinVault();
    userService = new OperationalUserService(userRepo, pinVault);
  });

  it('ensures an owner user can be created on business bootstrap', async () => {
    const res = await userService.createUser({
      businessId: 'biz-01',
      fullName: 'Dueño Principal',
      role: 'OWNER',
      pin: '1234',
      cloudUserId: 'cloud-uid-1',
    });

    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.role).toBe('OWNER');
    expect(res.user?.businessId).toBe('biz-01');
    expect(res.user?.cloudUserId).toBe('cloud-uid-1');
  });

  it('retrieves active users for the business and excludes other businesses', async () => {
    await userService.createUser({ businessId: 'biz-01', fullName: 'Owner 1', role: 'OWNER', pin: '1111' });
    await userService.createUser({ businessId: 'biz-02', fullName: 'Owner 2', role: 'OWNER', pin: '2222' });

    const biz1Users = await userService.getActiveUsers('biz-01');
    const biz2Users = await userService.getActiveUsers('biz-02');

    expect(biz1Users.length).toBe(1);
    expect(biz1Users[0].firstName).toBe('Owner');
    expect(biz2Users.length).toBe(1);
    expect(biz2Users[0].firstName).toBe('Owner');
  });
});
