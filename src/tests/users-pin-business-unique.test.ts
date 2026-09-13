import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { User } from '../domain/user/User';

describe('Operational Users - PIN Business Uniqueness & Isolation', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let userService: OperationalUserService;

  const ownerUser: User = {
    id: 'owner-admin-1',
    businessId: 'biz-alpha',
    firstName: 'Dueño',
    role: 'OWNER',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    userService = new OperationalUserService(userRepo, pinVault);
  });

  it('rejects duplicate PIN in the same business with human-friendly copy', async () => {
    const resA = await userService.createUser(
      {
        businessId: 'biz-alpha',
        firstName: 'Cajero A',
        role: 'CASHIER',
        pin: '1234',
      },
      ownerUser
    );
    expect(resA.success).toBe(true);

    const resB = await userService.createUser(
      {
        businessId: 'biz-alpha',
        firstName: 'Cajero B',
        role: 'CASHIER',
        pin: '1234',
      },
      ownerUser
    );

    expect(resB.success).toBe(false);
    expect(resB.error).toBe('Este PIN ya está siendo utilizado por otro usuario.');
  });

  it('allows same PIN across different businesses (business-scoped isolation)', async () => {
    const resAlpha = await userService.createUser(
      {
        businessId: 'biz-alpha',
        firstName: 'Operador Alpha',
        role: 'CASHIER',
        pin: '5678',
      },
      ownerUser
    );
    expect(resAlpha.success).toBe(true);

    const ownerBeta: User = {
      id: 'owner-beta-1',
      businessId: 'biz-beta',
      firstName: 'Dueño Beta',
      role: 'OWNER',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resBeta = await userService.createUser(
      {
        businessId: 'biz-beta',
        firstName: 'Operador Beta',
        role: 'CASHIER',
        pin: '5678',
      },
      ownerBeta
    );

    expect(resBeta.success).toBe(true);
  });
});
