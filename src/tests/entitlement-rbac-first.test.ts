import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { UsageService } from '../application/subscription/UsageService';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { User } from '../domain/user/User';

describe('Entitlement - RBAC First Precedence', () => {
  let userRepo: InMemoryUserRepository;
  let subRepo: InMemorySubscriptionRepository;
  let usageService: UsageService;
  let entitlementService: EntitlementService;
  let pinVault: WebCryptoPinVaultFallback;
  let userService: OperationalUserService;

  let cashier: User;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    subRepo = new InMemorySubscriptionRepository();
    // Set to Pro so plan limits are NOT exceeded
    await subRepo.setPlan('biz-rbac-test', 'PRO');

    usageService = new UsageService(subRepo, { userRepo });
    entitlementService = new EntitlementService(subRepo, usageService);
    pinVault = new WebCryptoPinVaultFallback();
    userService = new OperationalUserService(userRepo, pinVault, entitlementService);

    // Initial setup with owner
    const res = await userService.createUser({
      businessId: 'biz-rbac-test',
      firstName: 'Dueña',
      lastName: 'Principal',
      role: 'OWNER',
      pin: '1234',
    });

    const res2 = await userService.createUser(
      {
        businessId: 'biz-rbac-test',
        firstName: 'Carlos',
        lastName: 'Cajero',
        role: 'CASHIER',
        pin: '5678',
      },
      res.user!
    );
    cashier = res2.user!;
  });

  it('CASHIER actor attempting to create a user is denied by RBAC (UNAUTHORIZED_ROLE), not entitlement', async () => {
    const result = await userService.createUser(
      {
        businessId: 'biz-rbac-test',
        firstName: 'Nuevo',
        lastName: 'Usuario',
        role: 'CASHIER',
        pin: '9999',
      },
      cashier // Cashier is not allowed to create users
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No tienes permisos para administrar usuarios/i);
  });
});
