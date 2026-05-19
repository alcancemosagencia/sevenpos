import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SubscriptionBlocked } from "@/features/billing/subscription-blocked";
import { effectiveSubscriptionStatus, isSubscriptionBlocked } from "@/features/billing/utils";
import { defaultRedirectForRole, can } from "@/lib/rbac";
import { permissionForPath } from "@/lib/route-permissions";
import { getTenantContext } from "@/lib/tenant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantContext();

  if (!tenant) {
    redirect("/sign-in");
  }

  const pathname = (await headers()).get("x-sevenpos-pathname") ?? "/dashboard";
  const defaultPath = defaultRedirectForRole(tenant.currentUser.role);

  if (tenant.isSuperAdmin && !pathname.startsWith("/admin")) {
    redirect("/admin");
  }

  if (!tenant.isSuperAdmin && !tenant.currentBusiness) {
    redirect("/onboarding");
  }

  const requiredPermission = permissionForPath(pathname);

  if (requiredPermission && !can(tenant.currentUser.role, requiredPermission)) {
    redirect(defaultPath);
  }

  if (!tenant.isSuperAdmin && tenant.currentBusiness) {
    const effectiveStatus = effectiveSubscriptionStatus({
      status: tenant.currentBusiness.subscriptionStatus,
      trialEnd: new Date(tenant.currentBusiness.trialEnd),
      nextPaymentAt: tenant.currentBusiness.nextPaymentAt ? new Date(tenant.currentBusiness.nextPaymentAt) : null,
    });
    const protectedBillingPaths = ["/pos", "/dashboard"];
    const shouldBlock = protectedBillingPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

    if (shouldBlock && isSubscriptionBlocked(effectiveStatus)) {
      return (
        <SubscriptionBlocked
          businessName={tenant.currentBusiness.name}
          status={effectiveStatus}
        />
      );
    }
  }

  if (pathname === "/pos" || pathname.startsWith("/pos/") || pathname === "/customer-display" || pathname === "/kds") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return <AppShell tenant={tenant}>{children}</AppShell>;
}
