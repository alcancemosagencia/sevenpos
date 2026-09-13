import { describe, it, expect } from 'vitest';
import { PermissionService } from '../domain/auth/Permissions';

describe('RBAC - Purchases Route Permission', () => {
  it('protects /purchases and purchases orders/suppliers with purchases.manage', () => {
    expect(PermissionService.can('OWNER', 'purchases.manage')).toBe(true);
    expect(PermissionService.can('ADMIN', 'purchases.manage')).toBe(true);
    expect(PermissionService.can('CASHIER', 'purchases.manage')).toBe(false);
  });

  it('confirms purchases is NOT guarded by inventory.view (which Cashier has)', () => {
    expect(PermissionService.can('CASHIER', 'inventory.view')).toBe(true);
    expect(PermissionService.can('CASHIER', 'purchases.manage')).toBe(false);
  });
});
