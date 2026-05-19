import { redirect } from "next/navigation";
import { defaultRedirectForRole } from "@/lib/rbac";
import { getTenantContext } from "@/lib/tenant";

export default async function HomePage() {
  const tenant = await getTenantContext();

  if (!tenant) {
    redirect("/sign-in");
  }

  if (!tenant.isSuperAdmin && !tenant.currentBusiness) {
    redirect("/onboarding");
  }

  redirect(defaultRedirectForRole(tenant.currentUser.role));
}
