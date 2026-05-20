import { redirect } from "next/navigation";
import { SubscriptionBlocked } from "@/features/billing/subscription-blocked";
import { effectiveSubscriptionStatus, isSubscriptionBlocked } from "@/features/billing/utils";
import { decimalToNumber } from "@/features/pos/format";
import { CustomerDisplay } from "@/features/pos/customer-display";
import { can, defaultRedirectForRole } from "@/lib/rbac";
import { requireTenantContext } from "@/lib/tenant";

export default async function CustomerDisplayPage() {
  const tenant = await requireTenantContext();

  if (!tenant.businessId || !tenant.currentBusiness) {
    redirect("/onboarding");
  }

  if (tenant.isSuperAdmin) {
    redirect("/admin");
  }

  if (!can(tenant.currentUser.role, "pos:access")) {
    redirect(defaultRedirectForRole(tenant.currentUser.role));
  }

  const effectiveStatus = effectiveSubscriptionStatus({
    status: tenant.currentBusiness.subscriptionStatus,
    trialEnd: new Date(tenant.currentBusiness.trialEnd),
    nextPaymentAt: tenant.currentBusiness.nextPaymentAt ? new Date(tenant.currentBusiness.nextPaymentAt) : null,
  });

  if (isSubscriptionBlocked(effectiveStatus)) {
    return (
      <SubscriptionBlocked
        businessName={tenant.currentBusiness.name}
        status={effectiveStatus}
      />
    );
  }

  return (
    <CustomerDisplay
      businessId={tenant.businessId}
      businessName={tenant.currentBusiness.name}
      exchangeRate={decimalToNumber(tenant.currentBusiness.exchangeRate)}
    />
  );
}
