import { describe, it, expect } from 'vitest';
import { Permission, PermissionService } from '../domain/auth/Permissions';

describe('AG-13B: Route Permission Rules for Protected Navigation', () => {
  const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
    '/settings': 'settings.manage',
    '/audit': 'audit.view',
    '/reports': 'reports.view',
    '/expenses': 'expenses.manage',
    '/purchases': 'purchases.manage',
    '/stock-adjustments': 'inventory.adjust',
  };

  const isRouteAllowed = (route: string, role: 'OWNER' | 'ADMIN' | 'CASHIER'): boolean => {
    const required = ROUTE_PERMISSION_MAP[route];
    if (!required) return true;
    return PermissionService.can(role, required);
  };

  it('permits OWNER to access all protected routes', () => {
    for (const route of Object.keys(ROUTE_PERMISSION_MAP)) {
      expect(isRouteAllowed(route, 'OWNER')).toBe(true);
    }
  });

  it('permits ADMIN to access reports, expenses, purchases, adjustments', () => {
    expect(isRouteAllowed('/reports', 'ADMIN')).toBe(true);
    expect(isRouteAllowed('/expenses', 'ADMIN')).toBe(true);
    expect(isRouteAllowed('/purchases', 'ADMIN')).toBe(true);
    expect(isRouteAllowed('/stock-adjustments', 'ADMIN')).toBe(true);
  });

  it('denies CASHIER access to settings, audit, reports, purchases, and stock adjustments', () => {
    expect(isRouteAllowed('/settings', 'CASHIER')).toBe(false);
    expect(isRouteAllowed('/audit', 'CASHIER')).toBe(false);
    expect(isRouteAllowed('/reports', 'CASHIER')).toBe(false);
    expect(isRouteAllowed('/purchases', 'CASHIER')).toBe(false);
    expect(isRouteAllowed('/stock-adjustments', 'CASHIER')).toBe(false);
  });
});
