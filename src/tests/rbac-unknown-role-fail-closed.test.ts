import { describe, it, expect } from 'vitest';
import { normalizeUserRole, UserRole } from '../domain/user/User';
import { PermissionService } from '../domain/auth/Permissions';
import { InMemoryUserRepository } from '../infrastructure/repositories/InMemoryUserRepository';
import { OperationalUserService } from '../application/user/OperationalUserService';
import { WebCryptoPinVaultFallback } from '../infrastructure/security/WebCryptoPinVaultFallback';

describe('RBAC - Unknown Role Fail Closed Policy', () => {
  it('normalizes recognized aliases correctly', () => {
    expect(normalizeUserRole('OWNER')).toBe('OWNER');
    expect(normalizeUserRole('owner')).toBe('OWNER');
    expect(normalizeUserRole('DUEÑO')).toBe('OWNER');
    expect(normalizeUserRole('dueño')).toBe('OWNER');

    expect(normalizeUserRole('ADMIN')).toBe('ADMIN');
    expect(normalizeUserRole('admin')).toBe('ADMIN');
    expect(normalizeUserRole('ADMINISTRADOR')).toBe('ADMIN');
    expect(normalizeUserRole('administrador')).toBe('ADMIN');

    expect(normalizeUserRole('CASHIER')).toBe('CASHIER');
    expect(normalizeUserRole('cashier')).toBe('CASHIER');
    expect(normalizeUserRole('CAJERO')).toBe('CASHIER');
    expect(normalizeUserRole('cajero')).toBe('CASHIER');
  });

  it('rejects and returns null for unknown or misspelled roles without coercion to CASHIER', () => {
    expect(normalizeUserRole('OWENR')).toBeNull();
    expect(normalizeUserRole('SUPERADMIN')).toBeNull();
    expect(normalizeUserRole('ROOT')).toBeNull();
    expect(normalizeUserRole('MANAGER')).toBeNull();
    expect(normalizeUserRole('garbage')).toBeNull();
    expect(normalizeUserRole('')).toBeNull();
    expect(normalizeUserRole(null)).toBeNull();
    expect(normalizeUserRole(undefined)).toBeNull();
    expect(normalizeUserRole(123)).toBeNull();
  });

  it('ensures INVALID role has zero permissions in PermissionService', () => {
    const permissions = PermissionService.getPermissionsForRole('INVALID');
    expect(permissions).toHaveLength(0);

    expect(PermissionService.can('INVALID', 'pos.sell')).toBe(false);
    expect(PermissionService.can('INVALID', 'sales.view')).toBe(false);
    expect(PermissionService.can('INVALID', 'catalog.view')).toBe(false);
    expect(PermissionService.can('INVALID', 'settings.manage')).toBe(false);
    expect(PermissionService.can('INVALID', 'users.manage')).toBe(false);
    expect(PermissionService.can('INVALID', 'financials.view_costs')).toBe(false);
    expect(PermissionService.can('INVALID', 'customers.export')).toBe(false);
  });

  it('rejects creating a user with an invalid or unknown role in OperationalUserService', async () => {
    const repo = new InMemoryUserRepository();
    const vault = new WebCryptoPinVaultFallback();
    const service = new OperationalUserService(repo, vault);

    const res = await service.createUser({
      businessId: 'biz-test',
      firstName: 'Intruder',
      role: 'SUPERADMIN' as unknown as UserRole,
      pin: '1234',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('El rol especificado no es válido.');
  });
});
