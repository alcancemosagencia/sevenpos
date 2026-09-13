import { describe, it, expect } from 'vitest';
import { PermissionService } from '../domain/auth/Permissions';

describe('RBAC - Customer Export Permission Matrix & UI Guards', () => {
  it('correctly maps customers.export permission across roles', () => {
    expect(PermissionService.can('OWNER', 'customers.export')).toBe(true);
    expect(PermissionService.can('ADMIN', 'customers.export')).toBe(true);
    expect(PermissionService.can('CASHIER', 'customers.export')).toBe(false);
    expect(PermissionService.can('INVALID', 'customers.export')).toBe(false);
    expect(PermissionService.can(undefined, 'customers.export')).toBe(false);
  });
});
