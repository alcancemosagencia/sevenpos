import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { can, permissionsFor } from "@/lib/rbac";
import { normalizeCommercialPlan, saasPlans } from "@/features/billing/plans";
import { featureListHas } from "@/lib/feature-gating";
import type { CurrentBusiness, Permission, Role, SessionUser, TenantContextValue } from "@/types/auth";

const businessSelect = {
  id: true,
  name: true,
  slug: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  country: true,
  currency: true,
  exchangeRate: true,
  plan: true,
  planId: true,
  subscriptionPlan: {
    select: {
      name: true,
      features: true,
    },
  },
  status: true,
  trialStart: true,
  trialEnd: true,
  subscriptionStatus: true,
  nextPaymentAt: true,
  createdAt: true,
} as const;

const userSelect = {
  id: true,
  clerkUserId: true,
  businessId: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  lastAccessAt: true,
  createdAt: true,
  business: {
    select: businessSelect,
  },
} as const;

function normalizeRole(value: unknown): Role {
  if (
    value === "SUPER_ADMIN" ||
    value === "OWNER" ||
    value === "ADMIN" ||
    value === "MANAGER" ||
    value === "CASHIER" ||
    value === "VENTA_APOYO" ||
    value === "BODEGA" ||
    value === "COCINA"
  ) {
    return value;
  }

  return "CASHIER";
}

function serializeBusiness(business: {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  exchangeRate: { toString(): string };
  plan: "FREE" | "BASIC" | "PRO" | "STARTER" | "BUSINESS" | "PREMIUM";
  planId: string | null;
  subscriptionPlan?: {
    name: string;
    features: unknown;
  } | null;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  trialStart: Date;
  trialEnd: Date;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
  nextPaymentAt: Date | null;
  createdAt: Date;
}): CurrentBusiness {
  const fallbackPlan = saasPlans[normalizeCommercialPlan(business.plan)];
  const features = Array.isArray(business.subscriptionPlan?.features)
    ? business.subscriptionPlan.features.filter((item): item is string => typeof item === "string")
    : [...fallbackPlan.features];

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    email: business.email,
    phone: business.phone,
    address: business.address,
    city: business.city,
    country: business.country,
    currency: business.currency,
    exchangeRate: business.exchangeRate.toString(),
    plan: business.plan,
    planId: business.planId,
    planName: business.subscriptionPlan?.name ?? fallbackPlan.label,
    features,
    status: business.status,
    trialStart: business.trialStart.toISOString(),
    trialEnd: business.trialEnd.toISOString(),
    subscriptionStatus: business.subscriptionStatus,
    nextPaymentAt: business.nextPaymentAt?.toISOString() ?? null,
    createdAt: business.createdAt.toISOString(),
  };
}

function serializeUser(user: {
  id: string;
  clerkUserId: string;
  businessId: string | null;
  fullName: string | null;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt: Date;
}): SessionUser {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    businessId: user.businessId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export function buildTenantContext(
  currentUser: SessionUser,
  currentBusiness: CurrentBusiness | null,
): TenantContextValue {
  const permissions = permissionsFor(currentUser.role);
  const hasPermission = (permission: Permission) => can(currentUser.role, permission);
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const isOwner = currentUser.role === "OWNER";
  const isAdmin = currentUser.role === "ADMIN" || isOwner || isSuperAdmin;
  const isCashier = currentUser.role === "CASHIER";
  const hasFeature = (feature: string) => {
    if (isSuperAdmin) return true;
    return featureListHas(currentBusiness?.features, feature);
  };

  return {
    currentUser,
    currentBusiness,
    businessId: currentUser.businessId,
    permissions,
    isSuperAdmin,
    isOwner,
    isAdmin,
    isCashier,
    canManageProducts: can(currentUser.role, "products:manage"),
    canViewReports: can(currentUser.role, "reports:view"),
    canManageUsers: can(currentUser.role, "users:manage"),
    canAccessSettings: can(currentUser.role, "settings:access"),
    canManageBranches: currentUser.role === "OWNER" || currentUser.role === "ADMIN" || currentUser.role === "MANAGER" || isSuperAdmin,
    canUsePreSales: currentUser.role === "VENTA_APOYO" || can(currentUser.role, "sales:create"),
    canManageBusinesses: can(currentUser.role, "businesses:manage"),
    canManagePlans: can(currentUser.role, "plans:manage"),
    canViewGlobalMetrics: can(currentUser.role, "globalMetrics:view"),
    hasPermission,
    hasFeature,
  };
}

export async function getTenantContext(): Promise<TenantContextValue | null> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const metadataRole = normalizeRole(clerkUser.publicMetadata.role);
  const metadataBusinessId =
    typeof clerkUser.publicMetadata.businessId === "string"
      ? clerkUser.publicMetadata.businessId
      : null;

  const validMetadataBusiness = metadataBusinessId
    ? await prisma.business.findUnique({
        where: { id: metadataBusinessId },
        select: { id: true },
      })
    : null;

  const existingUser = await prisma.user.findUnique({
    where: { clerkUserId: clerkUser.id },
    select: userSelect,
  });

  const now = new Date();
  const shouldTouchAccess =
    !existingUser?.lastAccessAt ||
    now.getTime() - existingUser.lastAccessAt.getTime() > 5 * 60 * 1000;

  const needsUserUpdate =
    existingUser &&
    (existingUser.email !== email ||
      existingUser.fullName !== clerkUser.fullName ||
      (!existingUser.businessId && Boolean(validMetadataBusiness?.id)) ||
      shouldTouchAccess);

  const user = existingUser
    ? needsUserUpdate
      ? await prisma.user.update({
        where: { clerkUserId: clerkUser.id },
        data: {
          email,
          fullName: clerkUser.fullName,
          isActive: existingUser.isActive,
          ...(shouldTouchAccess ? { lastAccessAt: now } : {}),
          businessId: existingUser.businessId ?? validMetadataBusiness?.id,
        },
        select: userSelect,
      })
      : existingUser
    : await prisma.user.create({
        data: {
          clerkUserId: clerkUser.id,
          email,
          fullName: clerkUser.fullName,
          role: metadataRole,
          lastAccessAt: now,
          businessId: validMetadataBusiness?.id,
        },
        select: userSelect,
      });

  return buildTenantContext(serializeUser(user), user.business ? serializeBusiness(user.business) : null);
}

export async function requireTenantContext() {
  const tenant = await getTenantContext();

  if (!tenant) {
    throw new Error("Authenticated tenant context required.");
  }

  return tenant;
}
