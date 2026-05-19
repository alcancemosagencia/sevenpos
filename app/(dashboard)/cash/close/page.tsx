import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { CashCloseForm } from "@/features/cash/cash-close-form";
import { getOpenCashSessionSummary } from "@/features/cash/queries";
import { requireTenantContext } from "@/lib/tenant";

export default async function CashClosePage() {
  const tenant = await requireTenantContext();

  if (!tenant.businessId) {
    redirect("/onboarding");
  }

  const cashSession = await getOpenCashSessionSummary(tenant.businessId);

  if (!cashSession) {
    redirect("/cash/open");
  }

  return (
    <>
      <PageHeader
        eyebrow="Caja operativa"
        title="Cerrar caja"
        description="Cuenta el efectivo real y revisa diferencias antes de finalizar el turno."
      />
      <div className="mx-auto max-w-2xl">
        <CashCloseForm
          expectedUsd={cashSession.expectedUsd}
          expectedBs={cashSession.expectedBs}
          expensesUsd={cashSession.expensesUsd}
          expensesBs={cashSession.expensesBs}
          incomesUsd={cashSession.incomesUsd}
          incomesBs={cashSession.incomesBs}
        />
      </div>
    </>
  );
}
