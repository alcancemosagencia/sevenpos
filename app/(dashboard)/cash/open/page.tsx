import { redirect } from "next/navigation";
import { SevenPosLogo } from "@/components/brand/sevenpos-logo";
import { CashOpenForm } from "@/features/cash/cash-open-form";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function CashOpenPage() {
  const tenant = await requireTenantContext();

  if (!tenant.businessId) {
    redirect("/onboarding");
  }

  const openSession = await prisma.cashSession.findFirst({
    where: { businessId: tenant.businessId, status: "OPEN" },
    select: { id: true },
  });

  if (openSession) {
    redirect("/pos");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-md flex-col justify-center py-6">
      <div className="mb-6 text-center">
        <SevenPosLogo className="mb-5 justify-center text-foreground" />
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Caja operativa</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">Abrir caja</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Antes de vender, inicia la caja del turno para controlar efectivo y movimientos.
        </p>
      </div>
      <CashOpenForm />
    </main>
  );
}
