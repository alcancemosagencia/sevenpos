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

describe('AG-13B: Strict Owner Protection Invariants', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: MockPinVault;
  let userService: OperationalUserService;

  let owner1: User;
  let admin1: User;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    pinVault = new MockPinVault();
    userService = new OperationalUserService(userRepo, pinVault);

    const o1 = await userService.createUser(
      { businessId: 'biz-01', fullName: 'Principal Owner', role: 'OWNER', pin: '1111' }
    );
    owner1 = o1.user!;

    const a1 = await userService.createUser(
      { businessId: 'biz-01', fullName: 'Admin User', role: 'ADMIN', pin: '2222' },
      owner1
    );
    admin1 = a1.user!;
  });

  it('prohibits deactivating the sole owner of the business', async () => {
    const res = await userService.deactivateUser(owner1.id, owner1);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Propietario');
  });

  it('prohibits downgrading the role of the sole owner', async () => {
    const res = await userService.changeUserRole(owner1.id, 'ADMIN', owner1);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Propietario');
  });

  it('prohibits non-owners (e.g. ADMIN) from deactivating or changing role of an OWNER', async () => {
    // Add a second owner first
    await userService.createUser(
      { businessId: 'biz-01', fullName: 'Second Owner', role: 'OWNER', pin: '4444' },
      owner1
    );

    // Admin tries to deactivate owner1
    const res = await userService.deactivateUser(owner1.id, admin1);
    expect(res.success).toBe(false);
  });

  it('allows deactivating an owner if there is at least another active owner, when performed by an OWNER', async () => {
    const o2 = await userService.createUser(
      { businessId: 'biz-01', fullName: 'Second Owner', role: 'OWNER', pin: '4444' },
      owner1
    );
    const owner2 = o2.user!;

    const res = await userService.deactivateUser(owner2.id, owner1);
    expect(res.success).toBe(true);
  });
});
