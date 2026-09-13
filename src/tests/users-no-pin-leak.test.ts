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

describe('AG-13B: Zero Plaintext PIN Leakage Contract', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: MockPinVault;
  let userService: OperationalUserService;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    pinVault = new MockPinVault();
    userService = new OperationalUserService(userRepo, pinVault);
  });

  it('guarantees User domain model and repositories NEVER expose plaintext PINs', async () => {
    const SECRET_PIN = '7429';
    const res = await userService.createUser({
      businessId: 'biz-01',
      fullName: 'Secret Operator',
      role: 'CASHIER',
      pin: SECRET_PIN,
    });

    expect(res.success).toBe(true);
    const user = res.user!;

    // 1. Check User domain object has no pin or password property
    expect((user as unknown as Record<string, unknown>).pin).toBeUndefined();
    expect((user as unknown as Record<string, unknown>).password).toBeUndefined();
    expect(JSON.stringify(user)).not.toContain(SECRET_PIN);

    // 2. Check Repository getUserById result
    const fetched = await userRepo.getUserById(user.id);
    expect(fetched).toBeDefined();
    expect((fetched as unknown as Record<string, unknown>).pin).toBeUndefined();
    expect(JSON.stringify(fetched)).not.toContain(SECRET_PIN);
  });
});
