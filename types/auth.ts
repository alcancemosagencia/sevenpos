export const roles = ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER", "CASHIER", "VENTA_APOYO", "BODEGA", "COCINA"] as const;

export type Role = (typeof roles)[number];

export type SessionUser = {
  id: string;
  clerkUserId: string;
  businessId: string | null;
  fullName: string | null;
  email: string;
  role: Role;
  createdAt?: string;
};

export type CurrentBusiness = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  exchangeRate: string;
  plan: "FREE" | "BASIC" | "PRO" | "STARTER" | "BUSINESS" | "PREMIUM";
  planId: string | null;
  planName: string | null;
  features: string[];
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  trialStart: string;
  trialEnd: string;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
  nextPaymentAt: string | null;
  createdAt: string;
};

export type Permission =
  | "dashboard:view"
  | "pos:access"
  | "pre-sales:access"
  | "sales:create"
  | "products:manage"
  | "sales:view"
  | "inventory:view"
  | "customers:view"
  | "expenses:view"
  | "reports:view"
  | "settings:access"
  | "staff:manage"
  | "users:manage"
  | "businesses:manage"
  | "plans:manage"
  | "globalMetrics:view"
  | "admin:access";

export type TenantContextValue = {
  currentUser: SessionUser;
  currentBusiness: CurrentBusiness | null;
  businessId: string | null;
  permissions: Permission[];
  isSuperAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  canManageProducts: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canAccessSettings: boolean;
  canManageBranches: boolean;
  canUsePreSales: boolean;
  canManageBusinesses: boolean;
  canManagePlans: boolean;
  canViewGlobalMetrics: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasFeature: (feature: string) => boolean;
};

export type TenantContextSnapshot = Omit<TenantContextValue, "hasPermission" | "hasFeature">;
