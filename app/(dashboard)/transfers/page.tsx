import { ArrowLeftRight, Check, Package, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { decimalToNumber } from "@/features/pos/format";
import { createTransferAction, updateTransferStatusAction } from "@/features/transfers/actions";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

const statusLabels = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  SHIPPED: "En camino",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
};

const statusTone = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  RECEIVED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

function StatusButton({ transferId, status, children }: { transferId: string; status: string; children: React.ReactNode }) {
  return (
    <form action={updateTransferStatusAction}>
      <input type="hidden" name="transferId" value={transferId} />
      <input type="hidden" name="status" value={status} />
      <Button variant="secondary" className="h-8 px-2 text-xs">
        {children}
      </Button>
    </form>
  );
}

export default async function TransfersPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const branches = await prisma.branch.findMany({
    where: { businessId: tenant.businessId, isActive: true },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
  });
  const products = await prisma.product.findMany({
    where: { businessId: tenant.businessId, isActive: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  const transfers = await prisma.stockTransfer.findMany({
    where: { businessId: tenant.businessId },
    include: {
      fromBranch: true,
      toBranch: true,
      createdBy: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <section className="mx-auto w-full max-w-6xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Transferencias</h1>
          <p className="text-sm text-muted-foreground">Movimiento interno de stock entre sucursales.</p>
        </div>
        <details className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_hsl(218_92%_35%/0.2)]">
            <ArrowLeftRight className="size-4" />
            Nueva
          </summary>
          <Card className="absolute right-0 z-20 mt-2 w-[min(92vw,430px)] p-4 shadow-[0_24px_70px_hsl(220_20%_10%/0.18)]">
            <form action={createTransferAction} className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <select name="fromBranchId" required className="h-10 rounded-lg border bg-background px-3 text-sm font-semibold">
                  <option value="">Origen</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
                <select name="toBranchId" required className="h-10 rounded-lg border bg-background px-3 text-sm font-semibold">
                  <option value="">Destino</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </div>
              <select name="productId" required className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-semibold">
                <option value="">Producto</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                <Input name="quantity" type="number" min="0.001" step="0.001" placeholder="Cantidad" required />
                <Input name="notes" placeholder="Nota interna" />
              </div>
              <Button className="h-10 w-full">Crear transferencia</Button>
            </form>
          </Card>
        </details>
      </div>

      <Card className="overflow-hidden">
        {transfers.length ? (
          transfers.map((transfer) => {
            const itemLabel = transfer.items.map((item) => `${decimalToNumber(item.quantity)} ${item.product.name}`).join(", ");
            return (
              <div key={transfer.id} className="grid gap-3 border-b p-3 last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Truck className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{transfer.fromBranch.name} {"->"} {transfer.toBranch.name}</p>
                      <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${statusTone[transfer.status]}`}>
                        {statusLabels[transfer.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{itemLabel || "Sin items"} · {transfer.createdBy.fullName ?? transfer.createdBy.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {transfer.status === "PENDING" ? <StatusButton transferId={transfer.id} status="APPROVED"><Check className="mr-1 size-3" />Aprobar</StatusButton> : null}
                  {transfer.status === "APPROVED" ? <StatusButton transferId={transfer.id} status="SHIPPED"><Truck className="mr-1 size-3" />Enviar</StatusButton> : null}
                  {transfer.status === "SHIPPED" ? <StatusButton transferId={transfer.id} status="RECEIVED"><Package className="mr-1 size-3" />Recibir</StatusButton> : null}
                  {transfer.status !== "RECEIVED" && transfer.status !== "CANCELLED" ? <StatusButton transferId={transfer.id} status="CANCELLED"><X className="mr-1 size-3" />Cancelar</StatusButton> : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex min-h-[130px] items-center justify-center text-sm text-muted-foreground">No hay transferencias registradas</div>
        )}
      </Card>
    </section>
  );
}
