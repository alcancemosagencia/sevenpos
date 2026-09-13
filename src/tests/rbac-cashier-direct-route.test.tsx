import { describe, it, expect } from 'vitest';
import { PermissionService } from '../domain/auth/Permissions';

describe('RBAC - Cashier Direct Route Navigation Enforcement', () => {
  it('denies access to governance and administrative routes for CASHIER role', () => {
    // 1. Settings & Users
    expect(PermissionService.can('CASHIER', 'settings.manage')).toBe(false);
    expect(PermissionService.can('CASHIER', 'users.manage')).toBe(false);

    // 2. Audit Trail
    expect(PermissionService.can('CASHIER', 'audit.view')).toBe(false);

    // 3. Financials & Reports
    expect(PermissionService.can('CASHIER', 'reports.view')).toBe(false);
    expect(PermissionService.can('CASHIER', 'purchases.manage')).toBe(false);
    expect(PermissionService.can('CASHIER', 'expenses.manage')).toBe(false);
    expect(PermissionService.can('CASHIER', 'financials.view_costs')).toBe(false);

    // 4. Inventory Adjustments & Customer Export
    expect(PermissionService.can('CASHIER', 'inventory.adjust')).toBe(false);
    expect(PermissionService.can('CASHIER', 'customers.export')).toBe(false);
    expect(PermissionService.can('CASHIER', 'sales.void')).toBe(false);
  });

  it('allows access only to basic operational POS routes for CASHIER role', () => {
    expect(PermissionService.can('CASHIER', 'pos.sell')).toBe(true);
    expect(PermissionService.can('CASHIER', 'sales.view')).toBe(true);
    expect(PermissionService.can('CASHIER', 'cash.open')).toBe(true);
    expect(PermissionService.can('CASHIER', 'cash.close')).toBe(true);
    expect(PermissionService.can('CASHIER', 'catalog.view')).toBe(true);
    expect(PermissionService.can('CASHIER', 'inventory.view')).toBe(true);
    expect(PermissionService.can('CASHIER', 'customers.view')).toBe(true);
  });
});
