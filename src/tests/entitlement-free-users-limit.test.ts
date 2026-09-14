import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { UsageService } from '../application/subscription/UsageService';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { User } from '../domain/user/User';

describe('Entitlement - Free Users Limit (1 Operator) and Pro Users (5 Operators)', () => {
  let userRepo: InMemoryUserRepository;
  let subRepo: InMemorySubscriptionRepository;
  let usageService: UsageService;
  let entitlementService: EntitlementService;
  let pinVault: WebCryptoPinVaultFallback;
  let userService: OperationalUserService;

  let owner: User;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    await userRepo.resetAll();
    subRepo = new InMemorySubscriptionRepository();
    usageService = new UsageService(subRepo, { userRepo });
    entitlementService = new EntitlementService(subRepo, usageService);
    pinVault = new WebCryptoPinVaultFallback();
    userService = new OperationalUserService(userRepo, pinVault, entitlementService);

    // Initial setup creates 1 OWNER (the 1 allowed user in Free)
    const res = await userService.createUser({
      businessId: 'biz-user-test',
      firstName: 'Dueña',
      lastName: 'Principal',
      role: 'OWNER',
      pin: '1234',
    });
    owner = res.user!;
  });

  it('allows 1 active user in Free plan (e.g. Owner), blocks creating 2nd active user', async () => {
    expect(await usageService.getActiveUsersCount('biz-user-test')).toBe(1);

    // Attempting to create a second user (e.g. Cashier) in Free plan must fail
    const result = await userService.createUser(
      {
        businessId: 'biz-user-test',
        firstName: 'Carlos',
        lastName: 'Cajero',
        role: 'CASHIER',
        pin: '5678',
      },
      owner
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/alcanzado el límite de 1/i);
    expect(await usageService.getActiveUsersCount('biz-user-test')).toBe(1);
  });

  it('blocks reactivating a user if active count is at plan limit', async () => {
    // Switch to Pro temporarily to create a second user, then deactivate that user and downgrade to Free
    await subRepo.setPlan('biz-user-test', 'PRO');

    const createRes = await userService.createUser(
      {
        businessId: 'biz-user-test',
        firstName: 'Carlos',
        lastName: 'Cajero',
        role: 'CASHIER',
        pin: '5678',
      },
      owner
    );
    expect(createRes.success).toBe(true);
    const cashier = createRes.user!;

    // Deactivate cashier
    await userService.deactivateUser(cashier.id, owner);
    expect(await usageService.getActiveUsersCount('biz-user-test')).toBe(1);

    // Downgrade back to Free
    await subRepo.setPlan('biz-user-test', 'FREE');

    // Attempting to reactivate cashier while owner is active (1 active = limit reached) must fail
    const reactivateRes = await userService.reactivateUser(cashier.id, owner);
    expect(reactivateRes.success).toBe(false);
    expect(reactivateRes.error).toMatch(/alcanzado el límite de 1/i);
  });

  it('Pro plan allows up to 5 active users and blocks 6th', async () => {
    await subRepo.setPlan('biz-user-test', 'PRO');

    // Create 4 more users (making total 5 active)
    for (let i = 2; i <= 5; i++) {
      const res = await userService.createUser(
        {
          businessId: 'biz-user-test',
          firstName: `Operador`,
          lastName: `${i}`,
          role: 'CASHIER',
          pin: `100${i}`,
        },
        owner
      );
      expect(res.success).toBe(true);
    }

    expect(await usageService.getActiveUsersCount('biz-user-test')).toBe(5);

    // 6th user creation must fail due to safety ceiling
    const res6 = await userService.createUser(
      {
        businessId: 'biz-user-test',
        firstName: 'Extra',
        lastName: 'User',
        role: 'CASHIER',
        pin: '9999',
      },
      owner
    );

    expect(res6.success).toBe(false);
    expect(res6.error).toMatch(/capacidad operativa recomendada/i);
  });
});
