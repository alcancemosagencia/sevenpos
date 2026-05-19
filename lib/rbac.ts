import type { Permission, Role } from "@/types/auth";

const rolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "dashboard:view",
    "pos:access",
    "pre-sales:access",
    "sales:create",
    "products:manage",
    "sales:view",
    "inventory:view",
    "customers:view",
    "expenses:view",
    "reports:view",
    "settings:access",
    "staff:manage",
    "users:manage",
    "businesses:manage",
    "plans:manage",
    "globalMetrics:view",
    "admin:access",
  ],
  OWNER: [
    "dashboard:view",
    "pos:access",
    "pre-sales:access",
    "sales:create",
    "products:manage",
    "sales:view",
    "inventory:view",
    "customers:view",
    "expenses:view",
    "reports:view",
    "settings:access",
    "staff:manage",
    "users:manage",
  ],
  ADMIN: [
    "dashboard:view",
    "pos:access",
    "pre-sales:access",
    "sales:create",
    "products:manage",
    "sales:view",
    "inventory:view",
    "customers:view",
    "expenses:view",
    "reports:view",
    "settings:access",
    "staff:manage",
  ],
  MANAGER: [
    "dashboard:view",
    "pos:access",
    "pre-sales:access",
    "sales:create",
    "products:manage",
    "sales:view",
    "inventory:view",
    "customers:view",
    "expenses:view",
    "reports:view",
    "settings:access",
  ],
  CASHIER: ["dashboard:view", "pos:access", "sales:create", "sales:view", "customers:view"],
  VENTA_APOYO: ["pre-sales:access", "customers:view"],
  BODEGA: ["inventory:view", "products:manage"],
  COCINA: ["pos:access"],
};

export function can(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function permissionsFor(role: Role) {
  return rolePermissions[role];
}

export function defaultRedirectForRole(role: Role) {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "CASHIER") return "/pos";
  if (role === "VENTA_APOYO") return "/pre-sales";

  return "/dashboard";
}
