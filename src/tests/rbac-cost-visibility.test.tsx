import { describe, it, expect } from 'vitest';
import { PermissionService } from '../domain/auth/Permissions';

describe('AG-13B: Financial Cost & Margin Privacy Matrix', () => {
  it('allows OWNER and ADMIN to view cost prices and profit margins', () => {
    expect(PermissionService.can('OWNER', 'financials.view_costs')).toBe(true);
    expect(PermissionService.can('ADMIN', 'financials.view_costs')).toBe(true);
  });

  it('strictly hides cost prices and profit margins from CASHIER role', () => {
    expect(PermissionService.can('CASHIER', 'financials.view_costs')).toBe(false);
  });

  it('masks or displays cost based on can(financials.view_costs)', () => {
    const formatCostDisplay = (role: 'OWNER' | 'ADMIN' | 'CASHIER', cost: number) => {
      const canView = PermissionService.can(role, 'financials.view_costs');
      return canView ? `$${cost.toFixed(2)}` : '••••••';
    };

    expect(formatCostDisplay('OWNER', 12.5)).toBe('$12.50');
    expect(formatCostDisplay('ADMIN', 12.5)).toBe('$12.50');
    expect(formatCostDisplay('CASHIER', 12.5)).toBe('••••••');
  });
});
