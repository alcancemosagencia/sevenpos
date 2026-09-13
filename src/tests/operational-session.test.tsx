import { describe, it, expect } from 'vitest';
import { User, getUserDisplayName, formatUserRole } from '../domain/user/User';
import { Permission, PermissionService } from '../domain/auth/Permissions';

describe('AG-13B: Operational Session Helpers & Formatting', () => {
  const sampleUser: User = {
    id: 'usr-1',
    businessId: 'biz-01',
    role: 'OWNER',
    firstName: 'Roberto',
    lastName: 'Gómez',
    active: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  it('formats display names and roles correctly in Spanish', () => {
    expect(getUserDisplayName(sampleUser)).toBe('Roberto Gómez');
    expect(formatUserRole('OWNER')).toBe('Dueño');
    expect(formatUserRole('ADMIN')).toBe('Administrador');
    expect(formatUserRole('CASHIER')).toBe('Cajero');
  });

  it('evaluates hasAny and hasAll permissions correctly', () => {
    const cashierRole = 'CASHIER';
    // hasAny
    const hasAny1 = (['pos.sell', 'settings.manage'] as Permission[]).some((p) => PermissionService.can(cashierRole, p));
    expect(hasAny1).toBe(true);

    const hasAny2 = (['settings.manage', 'audit.view'] as Permission[]).some((p) => PermissionService.can(cashierRole, p));
    expect(hasAny2).toBe(false);

    // hasAll
    const hasAll1 = (['pos.sell', 'cash.open'] as Permission[]).every((p) => PermissionService.can(cashierRole, p));
    expect(hasAll1).toBe(true);

    const hasAll2 = (['pos.sell', 'settings.manage'] as Permission[]).every((p) => PermissionService.can(cashierRole, p));
    expect(hasAll2).toBe(false);
  });
});
