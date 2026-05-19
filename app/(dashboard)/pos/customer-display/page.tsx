import { redirect } from "next/navigation";
import { decimalToNumber } from "@/features/pos/format";
import { CustomerDisplay } from "@/features/pos/customer-display";
import { requireTenantContext } from "@/lib/tenant";

export default async function CustomerDisplayPage() {
  const tenant = await requireTenantContext();

  if (!tenant.businessId || !tenant.currentBusiness) {
    redirect("/onboarding");
  }

  return (
    <CustomerDisplay
      businessId={tenant.businessId}
      businessName={tenant.currentBusiness.name}
      exchangeRate={decimalToNumber(tenant.currentBusiness.exchangeRate)}
    />
  );
}
