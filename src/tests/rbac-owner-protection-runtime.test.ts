import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { User } from '../domain/user/User';

describe('RBAC - Owner Protection Runtime Invariants', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let userService: OperationalUserService;

  let owner1: User;
  let admin1: User;
  let cashier1: User;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    userService = new OperationalUserService(userRepo, pinVault);

    const resO1 = await userService.createUser({
      businessId: 'biz-1',
      firstName: 'Dueño Principal',
      role: 'OWNER',
      pin: '1111',
    });
    owner1 = resO1.user!;

    const resA1 = await userService.createUser(
      {
        businessId: 'biz-1',
        firstName: 'Administrador 1',
        role: 'ADMIN',
        pin: '2222',
      },
      owner1
    );
    admin1 = resA1.user!;

    const resC1 = await userService.createUser(
      {
        businessId: 'biz-1',
        firstName: 'Cajero 1',
        role: 'CASHIER',
        pin: '3333',
      },
      owner1
    );
    cashier1 = resC1.user!;
  });

  it('denies ADMIN from modifying an OWNER', async () => {
    const res = await userService.updateUser(
      {
        userId: owner1.id,
        firstName: 'Nombre Hackeado',
      },
      admin1
    );

    expect(res.success).toBe(false);
    expect(res.error).toBe('Solo un Propietario puede modificar a un Propietario.');
  });

  it('denies CASHIER from modifying an OWNER', async () => {
    const res = await userService.updateUser(
      {
        userId: owner1.id,
        firstName: 'Nombre Hackeado',
      },
      cashier1
    );

    expect(res.success).toBe(false);
    expect(res.error).toBe('Solo un Propietario puede modificar a un Propietario.');
  });

  it('denies single OWNER from deactivating themselves', async () => {
    const res = await userService.deactivateUser(owner1.id, owner1);
    expect(res.success).toBe(false);
    expect(res.error).toBe('No puedes desactivar al único Propietario activo del negocio.');
  });

  it('denies single OWNER from downgrading their own role to ADMIN or CASHIER', async () => {
    const resAdmin = await userService.changeUserRole(owner1.id, 'ADMIN', owner1);
    expect(resAdmin.success).toBe(false);
    expect(resAdmin.error).toBe('No puedes cambiar el rol del único Propietario activo del negocio.');

    const resCashier = await userService.changeUserRole(owner1.id, 'CASHIER', owner1);
    expect(resCashier.success).toBe(false);
    expect(resCashier.error).toBe('No puedes cambiar el rol del único Propietario activo del negocio.');
  });

  it('allows deactivating or downgrading an OWNER if another active OWNER remains', async () => {
    const resO2 = await userService.createUser(
      {
        businessId: 'biz-1',
        firstName: 'Dueño Secundario',
        role: 'OWNER',
        pin: '4444',
      },
      owner1
    );
    const owner2 = resO2.user!;

    const downgradeRes = await userService.changeUserRole(owner2.id, 'ADMIN', owner1);
    expect(downgradeRes.success).toBe(true);

    const lastOwnerRes = await userService.changeUserRole(owner1.id, 'CASHIER', owner1);
    expect(lastOwnerRes.success).toBe(false);
    expect(lastOwnerRes.error).toBe('No puedes cambiar el rol del único Propietario activo del negocio.');
  });
});
