import { describe, it, expect } from 'vitest';
import { Permission, PermissionService, ALL_PERMISSIONS, ROLE_PERMISSIONS } from '../domain/auth/Permissions';

describe('AG-13B: RBAC 22-Permission Catalog & Role Matrix', () => {
  it('contains exactly 22 defined permissions in the catalog', () => {
    expect(ALL_PERMISSIONS.length).toBe(22);
  });

  it('verifies OWNER role has all 22 permissions', () => {
    expect(ROLE_PERMISSIONS.OWNER.length).toBe(22);
    for (const perm of ALL_PERMISSIONS) {
      expect(PermissionService.can('OWNER', perm)).toBe(true);
    }
  });

  it('verifies ADMIN role permissions (all operational + management except settings.manage, users.manage, audit.view)', () => {
    expect(ROLE_PERMISSIONS.ADMIN.length).toBe(19);
    expect(PermissionService.can('ADMIN', 'customers.export')).toBe(true);
    expect(PermissionService.can('ADMIN', 'financials.view_costs')).toBe(true);
    expect(PermissionService.can('ADMIN', 'purchases.manage')).toBe(true);
    expect(PermissionService.can('ADMIN', 'expenses.manage')).toBe(true);
    expect(PermissionService.can('ADMIN', 'reports.view')).toBe(true);
  });

  it('verifies CASHIER role permissions (strictly operational front-of-house, no costs, no export, no user management)', () => {
    const cashierAllowed: Permission[] = [
      'pos.sell',
      'sales.view',
      'cash.open',
      'cash.close',
      'catalog.view',
      'inventory.view',
      'customers.view',
    ];

    expect(ROLE_PERMISSIONS.CASHIER.length).toBe(cashierAllowed.length);

    for (const perm of cashierAllowed) {
      expect(PermissionService.can('CASHIER', perm)).toBe(true);
    }

    // Explicitly denied to cashier
    expect(PermissionService.can('CASHIER', 'customers.export')).toBe(false);
    expect(PermissionService.can('CASHIER', 'financials.view_costs')).toBe(false);
    expect(PermissionService.can('CASHIER', 'users.manage')).toBe(false);
    expect(PermissionService.can('CASHIER', 'settings.manage')).toBe(false);
    expect(PermissionService.can('CASHIER', 'audit.view')).toBe(false);
    expect(PermissionService.can('CASHIER', 'reports.view')).toBe(false);
    expect(PermissionService.can('CASHIER', 'purchases.manage')).toBe(false);
  });
});
