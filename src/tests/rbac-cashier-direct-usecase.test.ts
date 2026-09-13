import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { PermissionService } from '../domain/auth/Permissions';
import { User } from '../domain/user/User';

describe('RBAC - Cashier Direct Use Case Enforcement', () => {
  let userRepo: InMemoryUserRepository;
  let pinVault: WebCryptoPinVaultFallback;
  let userService: OperationalUserService;

  let ownerUser: User;
  let cashierUser: User;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    pinVault = new WebCryptoPinVaultFallback();
    userService = new OperationalUserService(userRepo, pinVault);

    const resO = await userService.createUser({
      businessId: 'biz-1',
      firstName: 'Dueño',
      role: 'OWNER',
      pin: '1111',
    });
    ownerUser = resO.user!;

    const resC = await userService.createUser(
      {
        businessId: 'biz-1',
        firstName: 'Cajero Directo',
        role: 'CASHIER',
        pin: '2222',
      },
      ownerUser
    );
    cashierUser = resC.user!;
  });

  it('denies user creation when actor is CASHIER', async () => {
    const res = await userService.createUser(
      {
        businessId: 'biz-1',
        firstName: 'Subordinado',
        role: 'CASHIER',
        pin: '1234',
      },
      cashierUser
    );

    expect(res.success).toBe(false);
    expect(res.error).toBe('No tienes permisos para administrar usuarios.');
  });

  it('denies user modification when actor is CASHIER', async () => {
    const res = await userService.updateUser(
      {
        userId: ownerUser.id,
        firstName: 'Nuevo Nombre',
      },
      cashierUser
    );

    expect(res.success).toBe(false);
    expect(res.error).toBe('Solo un Propietario puede modificar a un Propietario.');
  });

  it('denies changing user role when actor is CASHIER', async () => {
    const res = await userService.changeUserRole(cashierUser.id, 'ADMIN', cashierUser);
    expect(res.success).toBe(false);
    expect(res.error).toBe('Solo un Propietario puede cambiar los roles de los usuarios.');
  });

  it('denies user deactivation when actor is CASHIER', async () => {
    const res = await userService.deactivateUser(cashierUser.id, cashierUser);
    expect(res.success).toBe(false);
    expect(res.error).toBe('No tienes permisos para desactivar usuarios.');
  });

  it('denies sensitive operational permissions via PermissionService guard', () => {
    expect(PermissionService.can(cashierUser.role, 'customers.export')).toBe(false);
    expect(PermissionService.can(cashierUser.role, 'inventory.adjust')).toBe(false);
    expect(PermissionService.can(cashierUser.role, 'sales.void')).toBe(false);
    expect(PermissionService.can(cashierUser.role, 'settings.manage')).toBe(false);
  });
});
