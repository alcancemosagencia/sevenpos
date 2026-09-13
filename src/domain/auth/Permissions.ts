import { UserRole } from '../user/User';

export type Permission =
  // POS & Ventas
  | 'pos.sell'
  | 'sales.view'
  | 'sales.void'
  | 'sales.discount'
  // Gestión de Caja
  | 'cash.open'
  | 'cash.close'
  | 'cash.view_all'
  | 'cash.movement'
  // Catálogo e Inventario
  | 'catalog.view'
  | 'catalog.edit'
  | 'inventory.view'
  | 'inventory.adjust'
  // Privacidad Financiera & Operaciones
  | 'financials.view_costs'
  | 'purchases.manage'
  | 'expenses.manage'
  // Clientes & Reportes
  | 'customers.view'
  | 'customers.edit'
  | 'customers.export'
  | 'reports.view'
  // Gobernanza & Configuración
  | 'audit.view'
  | 'settings.manage'
  | 'users.manage';

export const ALL_PERMISSIONS: Permission[] = [
  'pos.sell',
  'sales.view',
  'sales.void',
  'sales.discount',
  'cash.open',
  'cash.close',
  'cash.view_all',
  'cash.movement',
  'catalog.view',
  'catalog.edit',
  'inventory.view',
  'inventory.adjust',
  'financials.view_costs',
  'purchases.manage',
  'expenses.manage',
  'customers.view',
  'customers.edit',
  'customers.export',
  'reports.view',
  'audit.view',
  'settings.manage',
  'users.manage',
];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  ADMIN: [
    'pos.sell',
    'sales.view',
    'sales.void',
    'sales.discount',
    'cash.open',
    'cash.close',
    'cash.view_all',
    'cash.movement',
    'catalog.view',
    'catalog.edit',
    'inventory.view',
    'inventory.adjust',
    'financials.view_costs',
    'purchases.manage',
    'expenses.manage',
    'customers.view',
    'customers.edit',
    'customers.export',
    'reports.view',
  ],
  CASHIER: [
    'pos.sell',
    'sales.view',
    'cash.open',
    'cash.close',
    'catalog.view',
    'inventory.view',
    'customers.view',
  ],
  INVALID: [],
};

export class PermissionService {
  static getPermissionsForRole(role: UserRole): readonly Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  static can(role: UserRole | undefined | null, permission: Permission): boolean {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.includes(permission);
  }

  static hasAny(role: UserRole | undefined | null, permissions: Permission[]): boolean {
    if (!role) return false;
    return permissions.some((p) => this.can(role, p));
  }

  static hasAll(role: UserRole | undefined | null, permissions: Permission[]): boolean {
    if (!role) return false;
    return permissions.every((p) => this.can(role, p));
  }
}
