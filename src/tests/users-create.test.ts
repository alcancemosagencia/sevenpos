import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { PinVault } from '../domain/auth/PinVault';
import { User } from '../domain/user/User';

class MockPinVault implements PinVault {
  private pins = new Map<string, string>();
  async savePinCredential(userId: string, pin: string): Promise<void> { this.pins.set(userId, pin); }
  async verifyPin(userId: string, pin: string): Promise<boolean> { return this.pins.get(userId) === pin; }
  async hasPinCredential(userId: string): Promise<boolean> { return this.pins.has(userId); }
  async removePinCredential(userId: string): Promise<void> { this.pins.delete(userId); }
  async resetVault(): Promise<void> { this.pins.clear(); }
}

describe('AG-13B: User Creation Validation & Audit', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: MockPinVault;
  let userService: OperationalUserService;
  let ownerUser: User;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    pinVault = new MockPinVault();
    userService = new OperationalUserService(userRepo, pinVault);

    const ownerRes = await userService.createUser({
      businessId: 'biz-01',
      fullName: 'Owner Principal',
      role: 'OWNER',
      pin: '9999',
    });
    ownerUser = ownerRes.user!;
  });

  it('validates 4-digit PIN, full name presence, and creates active user', async () => {
    const invalidPinRes = await userService.createUser(
      { businessId: 'biz-01', fullName: 'Carlos Cajero', role: 'CASHIER', pin: '123' },
      ownerUser
    );
    expect(invalidPinRes.success).toBe(false);
    expect(invalidPinRes.error).toContain('4 dígitos');

    const emptyNameRes = await userService.createUser(
      { businessId: 'biz-01', fullName: '   ', role: 'CASHIER', pin: '1234' },
      ownerUser
    );
    expect(emptyNameRes.success).toBe(false);
    expect(emptyNameRes.error).toContain('nombre');

    const validRes = await userService.createUser(
      { businessId: 'biz-01', fullName: 'Carlos Cajero', role: 'CASHIER', pin: '8888' },
      ownerUser
    );
    expect(validRes.success).toBe(true);
    expect(validRes.user?.firstName).toBe('Carlos');
    expect(validRes.user?.lastName).toBe('Cajero');
    expect(validRes.user?.active).toBe(true);
  });
});
