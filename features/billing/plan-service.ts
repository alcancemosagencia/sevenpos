import "server-only";

import type { BusinessPlan, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeCommercialPlan, saasPlans, type CommercialPlan } from "@/features/billing/plans";

export type DynamicPlan = {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxBranches: number;
  trialAllowed: boolean;
  status: string;
  features: string[];
  businessCount?: number;
};

const basePlanIds: Record<CommercialPlan, string> = {
  STARTER: "plan_starter",
  BUSINESS: "plan_business",
  PREMIUM: "plan_premium",
};

function toFeatureList(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function planToDynamic(plan: {
  id: string;
  name: string;
  slug: string;
  priceMonthly: Prisma.Decimal;
  priceYearly: Prisma.Decimal;
  maxUsers: number;
  maxBranches: number;
  trialAllowed: boolean;
  status: string;
  features: Prisma.JsonValue;
  _count?: { businesses: number };
}): DynamicPlan {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    priceMonthly: Number(plan.priceMonthly),
    priceYearly: Number(plan.priceYearly),
    maxUsers: plan.maxUsers,
    maxBranches: plan.maxBranches,
    trialAllowed: plan.trialAllowed,
    status: plan.status,
    features: toFeatureList(plan.features),
    businessCount: plan._count?.businesses,
  };
}

function basePlanPayload(plan: CommercialPlan) {
  const source = saasPlans[plan];
  return {
    id: basePlanIds[plan],
    name: source.label,
    slug: plan.toLowerCase(),
    priceMonthly: source.priceUsd,
    priceYearly: source.annualPriceUsd,
    maxUsers: source.userLimit,
    maxBranches: source.branchLimit,
    trialAllowed: true,
    status: "ACTIVE",
    features: source.features,
  };
}

export async function ensureBasePlans() {
  const basePlans = Object.keys(saasPlans) as CommercialPlan[];

  for (const plan of basePlans) {
    const payload = basePlanPayload(plan);
    await prisma.plan.upsert({
      where: { slug: payload.slug },
      create: payload,
      update: {},
    });
  }

  await prisma.$executeRaw`
    UPDATE "Business"
    SET "planId" = CASE
      WHEN "plan" IN ('PREMIUM', 'PRO') THEN (SELECT "id" FROM "Plan" WHERE "slug" = 'premium')
      WHEN "plan" IN ('BUSINESS', 'BASIC') THEN (SELECT "id" FROM "Plan" WHERE "slug" = 'business')
      ELSE (SELECT "id" FROM "Plan" WHERE "slug" = 'starter')
    END
    WHERE "planId" IS NULL
  `;
}

export async function getDynamicPlans() {
  await ensureBasePlans();
  const plans = await prisma.plan.findMany({
    orderBy: [{ status: "asc" }, { priceMonthly: "asc" }],
    include: { _count: { select: { businesses: true } } },
  });

  return plans.map(planToDynamic);
}

export async function getPlanById(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { _count: { select: { businesses: true } } },
  });

  return plan ? planToDynamic(plan) : null;
}

export async function getBusinessFeatures(businessId: string) {
  await ensureBasePlans();
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      plan: true,
      subscriptionPlan: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          features: true,
          maxUsers: true,
          maxBranches: true,
        },
      },
    },
  });

  if (!business) {
    return { planId: null, planSlug: "starter", planName: "Starter", features: new Set<string>(), maxUsers: 0, maxBranches: 0 };
  }

  const fallback = normalizeCommercialPlan(business.plan);
  const fallbackPlan = saasPlans[fallback];
  const features = business.subscriptionPlan
    ? toFeatureList(business.subscriptionPlan.features)
    : fallbackPlan.features;

  return {
    planId: business.subscriptionPlan?.id ?? null,
    planSlug: business.subscriptionPlan?.slug ?? fallback.toLowerCase(),
    planName: business.subscriptionPlan?.name ?? fallbackPlan.label,
    features: new Set(features),
    maxUsers: business.subscriptionPlan?.maxUsers ?? fallbackPlan.userLimit,
    maxBranches: business.subscriptionPlan?.maxBranches ?? fallbackPlan.branchLimit,
  };
}

export async function assignBusinessPlan(businessId: string, planId: string) {
  await ensureBasePlans();
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true, slug: true } });
  if (!plan) throw new Error("Plan no encontrado.");

  const legacyPlan = normalizeCommercialPlan(plan.slug.toUpperCase()) as BusinessPlan;

  await prisma.business.update({
    where: { id: businessId },
    data: {
      planId: plan.id,
      plan: legacyPlan,
    },
  });
}
