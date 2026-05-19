import { SettingsClient } from "@/features/backoffice/settings-client";
import { getDynamicPlans } from "@/features/billing/plan-service";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function SettingsPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId || !tenant.currentBusiness) return null;

  const business = await prisma.business.findUnique({
    where: { id: tenant.businessId },
    select: {
      id: true,
      slug: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      currency: true,
      exchangeRate: true,
      subscriptionStatus: true,
      nextPaymentAt: true,
      lastPaymentAt: true,
      billingPaymentMethod: true,
      publicSettings: { select: { logoUrl: true } },
      _count: { select: { users: true, branches: true, products: true } },
      subscriptionPlan: {
        select: {
          id: true,
          name: true,
          slug: true,
          priceMonthly: true,
          priceYearly: true,
          maxUsers: true,
          maxBranches: true,
          features: true,
        },
      },
    },
  });

  if (!business) return null;

  const plans = await getDynamicPlans();
  const features = tenant.currentBusiness.features;

  return (
    <SettingsClient
      business={{
        id: business.id,
        slug: business.slug,
        name: business.name,
        email: business.email,
        phone: business.phone,
        address: business.address,
        city: business.city,
        country: business.country,
        currency: business.currency,
        exchangeRate: decimalToNumber(business.exchangeRate),
        logoUrl: business.publicSettings?.logoUrl ?? null,
        subscriptionStatus: business.subscriptionStatus,
        nextPaymentAt: business.nextPaymentAt?.toISOString() ?? null,
        lastPaymentAt: business.lastPaymentAt?.toISOString() ?? null,
        billingPaymentMethod: business.billingPaymentMethod,
        counts: business._count,
        plan: business.subscriptionPlan
          ? {
              id: business.subscriptionPlan.id,
              name: business.subscriptionPlan.name,
              slug: business.subscriptionPlan.slug,
              priceMonthly: decimalToNumber(business.subscriptionPlan.priceMonthly),
              priceYearly: decimalToNumber(business.subscriptionPlan.priceYearly),
              maxUsers: business.subscriptionPlan.maxUsers,
              maxBranches: business.subscriptionPlan.maxBranches,
              features,
            }
          : {
              id: tenant.currentBusiness.planId,
              name: tenant.currentBusiness.planName ?? tenant.currentBusiness.plan,
              slug: tenant.currentBusiness.plan.toLowerCase(),
              priceMonthly: 0,
              priceYearly: 0,
              maxUsers: 0,
              maxBranches: 0,
              features,
            },
      }}
      plans={plans}
      features={features}
    />
  );
}
