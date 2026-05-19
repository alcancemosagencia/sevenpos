import { Building2, Package, Repeat2, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ModalTrigger } from "@/components/shared/modal-trigger";
import { createBranchAction } from "@/features/branches/actions";
import { decimalToNumber, money } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function BranchesDashboardPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const branches = await prisma.branch.findMany({
    where: { businessId: tenant.businessId },
    include: {
      users: { select: { id: true } },
      inventory: { select: { stock: true, lowStockAlert: true } },
      sales: { select: { total: true }, take: 1000 },
      cashSessions: { where: { status: "OPEN" }, select: { id: true } },
    },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
  });
  const transfers = await prisma.stockTransfer.findMany({
    where: { businessId: tenant.businessId, status: { in: ["PENDING", "APPROVED", "SHIPPED"] } },
    include: { fromBranch: true, toBranch: true },
    take: 8,
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Multi-sucursal</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Sucursales</h1>
          <p className="text-sm text-muted-foreground">Ventas, caja, stock critico y transferencias por sucursal.</p>
        </div>
        <ModalTrigger
          title="Crear sucursal"
          size="md"
          trigger={<span className="flex h-10 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Nueva sucursal</span>}
        >
            <form action={createBranchAction} className="grid gap-3 p-4">
              <input name="name" placeholder="Nombre" className="h-10 rounded-lg border bg-background px-3 text-sm" />
              <input name="address" placeholder="Dirección" className="h-10 rounded-lg border bg-background px-3 text-sm" />
              <input name="phone" placeholder="Teléfono" className="h-10 rounded-lg border bg-background px-3 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input name="currency" defaultValue={tenant.currentBusiness?.currency ?? "USD"} className="h-10 rounded-lg border bg-background px-3 text-sm" />
                <input name="exchangeRate" defaultValue={tenant.currentBusiness?.exchangeRate ?? "1"} className="h-10 rounded-lg border bg-background px-3 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium"><input name="isMain" type="checkbox" className="size-4 accent-primary" /> Principal</label>
              <button className="h-10 rounded-lg bg-primary font-semibold text-primary-foreground">Guardar</button>
            </form>
        </ModalTrigger>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {branches.map((branch) => {
          const sales = branch.sales.reduce((sum, sale) => sum + decimalToNumber(sale.total), 0);
          const critical = branch.inventory.filter((item) => decimalToNumber(item.stock) <= decimalToNumber(item.lowStockAlert)).length;
          return (
            <Card key={branch.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold">{branch.name}</p>
                  <p className="text-xs text-muted-foreground">{branch.address ?? "Sin Dirección"}</p>
                </div>
                <span className="rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">{branch.isMain ? "Principal" : "Sucursal"}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric icon={Wallet} label="Ventas" value={money(sales, "USD")} />
                <Metric icon={Package} label="Stock critico" value={critical} />
                <Metric icon={Users} label="Usuarios" value={branch.users.length} />
                <Metric icon={Building2} label="Caja" value={branch.cashSessions.length ? "Abierta" : "Cerrada"} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-3 py-3"><h2 className="text-sm font-semibold">Transferencias pendientes</h2></div>
        {transfers.map((transfer) => (
          <div key={transfer.id} className="flex items-center justify-between border-b px-3 py-3 text-sm last:border-b-0">
            <div className="flex items-center gap-3"><Repeat2 className="size-4 text-primary" /><p className="font-medium">{transfer.fromBranch.name} â†’ {transfer.toBranch.name}</p></div>
            <span className="rounded-lg bg-muted px-2 py-1 text-xs font-semibold">{transfer.status}</span>
          </div>
        ))}
      </Card>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <Icon className="mb-1 size-4 text-primary" />
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
