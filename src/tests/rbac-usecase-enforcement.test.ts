import { describe, it, expect } from 'vitest';
import { PermissionService } from '../domain/auth/Permissions';

describe('AG-13B: RBAC Use Case Action Guards', () => {
  it('enforces that cashiers cannot manage users, adjust stock, or view settings', () => {
    const role = 'CASHIER';
    expect(PermissionService.can(role, 'users.manage')).toBe(false);
    expect(PermissionService.can(role, 'inventory.adjust')).toBe(false);
    expect(PermissionService.can(role, 'settings.manage')).toBe(false);
    expect(PermissionService.can(role, 'audit.view')).toBe(false);
    expect(PermissionService.can(role, 'reports.view')).toBe(false);
  });

  it('enforces that admins can adjust stock, view reports, manage purchases and expenses', () => {
    const role = 'ADMIN';
    expect(PermissionService.can(role, 'inventory.adjust')).toBe(true);
    expect(PermissionService.can(role, 'purchases.manage')).toBe(true);
    expect(PermissionService.can(role, 'expenses.manage')).toBe(true);
    expect(PermissionService.can(role, 'reports.view')).toBe(true);
  });

  it('enforces that owners have complete unbounded authority', () => {
    const role = 'OWNER';
    expect(PermissionService.can(role, 'settings.manage')).toBe(true);
    expect(PermissionService.can(role, 'users.manage')).toBe(true);
    expect(PermissionService.can(role, 'audit.view')).toBe(true);
  });
});
