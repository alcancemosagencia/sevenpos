import { Clock, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentBranchForUser } from "@/features/branches/branch-context";
import { updateKdsStatusAction } from "@/features/hardware/actions";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

const statusLabel = {
  PENDING: "Pendiente",
  PREPARING: "Preparando",
  READY: "Listo",
};

const nextStatus = {
  PENDING: "PREPARING",
  PREPARING: "READY",
  READY: "READY",
};

export default async function KdsPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;
  const branch = await getCurrentBranchForUser(tenant.businessId, tenant.currentUser.id);

  const sales = await prisma.sale.findMany({
    where: {
      businessId: tenant.businessId,
      branchId: branch.id,
      kdsStatus: { in: ["PENDING", "PREPARING"] },
      createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 12) },
    },
    include: {
      cashier: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  return (
    <main className="min-h-[100dvh] bg-[hsl(220_18%_96%)] p-3 text-foreground sm:p-5">
      <header className="mb-3 flex items-center justify-between rounded-lg border bg-card px-4 py-3 shadow-[0_8px_24px_hsl(220_20%_10%/0.06)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Kitchen display</p>
          <h1 className="text-xl font-semibold tracking-tight">{branch.name}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
          <ChefHat className="size-4" />
          {sales.length} pedidos
        </div>
      </header>

      <section className="grid auto-rows-max gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sales.map((sale) => {
          const ageMinutes = Math.max(0, Math.round((Date.now() - sale.createdAt.getTime()) / 60000));
          return (
            <Card key={sale.id} className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b bg-card p-3">
                <div>
                  <p className="text-lg font-semibold">Orden #{sale.id.slice(-5).toUpperCase()}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{sale.cashier.fullName ?? sale.cashier.email}</p>
                </div>
                <span className="rounded-lg bg-muted px-2 py-1 text-xs font-semibold">{statusLabel[sale.kdsStatus]}</span>
              </div>
              <div className="space-y-2 p-3">
                {sale.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-muted/55 px-3 py-2">
                    <span className="font-semibold">{item.product.name}</span>
                    <span className="font-semibold">x{decimalToNumber(item.quantityDecimal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t p-3">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Clock className="size-3.5" />
                  {ageMinutes} min
                </div>
                {sale.kdsStatus !== "READY" ? (
                  <form action={updateKdsStatusAction}>
                    <input type="hidden" name="saleId" value={sale.id} />
                    <input type="hidden" name="status" value={nextStatus[sale.kdsStatus]} />
                    <Button className="h-9 px-3 text-xs">
                      {sale.kdsStatus === "PENDING" ? "Preparar" : "Marcar listo"}
                    </Button>
                  </form>
                ) : null}
              </div>
            </Card>
          );
        })}
      </section>

      {sales.length === 0 ? (
        <Card className="mt-4 flex min-h-[220px] items-center justify-center text-sm font-semibold text-muted-foreground">
          No hay pedidos pendientes.
        </Card>
      ) : null}
    </main>
  );
}
