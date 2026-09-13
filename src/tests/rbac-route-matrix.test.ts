import { describe, it, expect } from 'vitest';
import { Permission, PermissionService } from '../domain/auth/Permissions';

describe('RBAC - Full Route Permission Matrix Audit', () => {
  interface RouteSpec {
    route: string;
    permission: Permission | null;
    ownerAllowed: boolean;
    adminAllowed: boolean;
    cashierAllowed: boolean;
  }

  const CORE_ROUTES: RouteSpec[] = [
    { route: 'dashboard', permission: null, ownerAllowed: true, adminAllowed: true, cashierAllowed: true },
    { route: 'pos', permission: 'pos.sell', ownerAllowed: true, adminAllowed: true, cashierAllowed: true },
    { route: 'sales', permission: 'sales.view', ownerAllowed: true, adminAllowed: true, cashierAllowed: true },
    { route: 'products', permission: 'catalog.view', ownerAllowed: true, adminAllowed: true, cashierAllowed: true },
    { route: 'categories', permission: 'catalog.view', ownerAllowed: true, adminAllowed: true, cashierAllowed: true },
    { route: 'inventory', permission: 'inventory.view', ownerAllowed: true, adminAllowed: true, cashierAllowed: true },
    { route: 'purchases', permission: 'purchases.manage', ownerAllowed: true, adminAllowed: true, cashierAllowed: false },
    { route: 'suppliers', permission: 'purchases.manage', ownerAllowed: true, adminAllowed: true, cashierAllowed: false },
    { route: 'cash', permission: 'cash.open', ownerAllowed: true, adminAllowed: true, cashierAllowed: true },
    { route: 'expenses', permission: 'expenses.manage', ownerAllowed: true, adminAllowed: true, cashierAllowed: false },
    { route: 'customers', permission: 'customers.view', ownerAllowed: true, adminAllowed: true, cashierAllowed: true },
    { route: 'reports', permission: 'reports.view', ownerAllowed: true, adminAllowed: true, cashierAllowed: false },
    { route: 'audit', permission: 'audit.view', ownerAllowed: true, adminAllowed: false, cashierAllowed: false },
    { route: 'settings', permission: 'settings.manage', ownerAllowed: true, adminAllowed: false, cashierAllowed: false },
  ];

  it('validates exact access per role across all 14 core routes with zero incorrect cross-permissions', () => {
    for (const spec of CORE_ROUTES) {
      if (!spec.permission) {
        expect(spec.ownerAllowed).toBe(true);
        expect(spec.adminAllowed).toBe(true);
        expect(spec.cashierAllowed).toBe(true);
      } else {
        expect(PermissionService.can('OWNER', spec.permission)).toBe(spec.ownerAllowed);
        expect(PermissionService.can('ADMIN', spec.permission)).toBe(spec.adminAllowed);
        expect(PermissionService.can('CASHIER', spec.permission)).toBe(spec.cashierAllowed);
      }
    }
  });
});
