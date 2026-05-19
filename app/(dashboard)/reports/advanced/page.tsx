import Link from "next/link";
import { ArrowDownToLine, BarChart3, Clock, Package, Receipt, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentBranchForUser } from "@/features/branches/branch-context";
import { decimalToNumber, money } from "@/features/pos/format";
import { CompactBarChart, DonutChart, SalesLineChart } from "@/features/reports/advanced-charts";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

const paymentLabels: Record<string, string> = {
  CASH_USD: "Efectivo USD",
  CASH_BS: "Efectivo Bs",
  MOBILE_PAYMENT: "Pago movil",
  BANK_TRANSFER: "Transferencia",
};

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateRange(fromParam?: string, toParam?: string) {
  const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 13);
  const to = toParam ? new Date(toParam) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export default async function AdvancedReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branchId?: string; cashierId?: string; categoryId?: string; paymentMethod?: string }>;
}) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const params = await searchParams;
  const { from, to } = parseDateRange(params.from, params.to);
  const defaultBranch = await getCurrentBranchForUser(tenant.businessId, tenant.currentUser.id);
  const branchId = params.branchId === "ALL" ? undefined : params.branchId || undefined;
  const cashierId = params.cashierId === "ALL" ? undefined : params.cashierId || undefined;
  const categoryId = params.categoryId === "ALL" ? undefined : params.categoryId || undefined;
  const paymentMethod = params.paymentMethod === "ALL" ? undefined : params.paymentMethod || undefined;

  const saleWhere = {
    businessId: tenant.businessId,
    createdAt: { gte: from, lte: to },
    ...(branchId ? { branchId } : {}),
    ...(cashierId ? { cashierId } : {}),
    ...(paymentMethod ? { paymentMethod: paymentMethod as PaymentMethod } : {}),
  };

  const branches = await prisma.branch.findMany({
    where: { businessId: tenant.businessId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const users = await prisma.user.findMany({
    where: { businessId: tenant.businessId },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true },
  });
  const categories = await prisma.category.findMany({
    where: { businessId: tenant.businessId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const sales = await prisma.sale.findMany({
    where: saleWhere,
    orderBy: { createdAt: "asc" },
    take: 1200,
    select: {
      id: true,
      total: true,
      createdAt: true,
      paymentMethod: true,
      branchId: true,
      cashierId: true,
      branch: { select: { name: true } },
      cashier: { select: { fullName: true, email: true } },
    },
  });

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: saleWhere,
      ...(categoryId ? { product: { categoryId } } : {}),
    },
    take: 2500,
    select: {
      productId: true,
      subtotal: true,
      quantityDecimal: true,
      product: {
        select: {
          name: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  const cashSessions = await prisma.cashSession.findMany({
    where: { businessId: tenant.businessId, openedAt: { gte: from, lte: to }, ...(branchId ? { branchId } : {}) },
    orderBy: { openedAt: "desc" },
    take: 12,
    select: { id: true, status: true, differenceUsd: true, differenceBs: true, branch: { select: { name: true } } },
  });

  const lowStock = await prisma.branchInventory.findMany({
    where: { businessId: tenant.businessId, ...(branchId ? { branchId } : { branchId: defaultBranch.id }) },
    take: 80,
    select: {
      stock: true,
      lowStockAlert: true,
      branch: { select: { name: true } },
      product: { select: { name: true } },
    },
  });

  const transfers = await prisma.stockTransfer.findMany({
    where: { businessId: tenant.businessId, createdAt: { gte: from, lte: to }, ...(branchId ? { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] } : {}) },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      createdAt: true,
      fromBranch: { select: { name: true } },
      toBranch: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });

  const preSalesByStatus = await prisma.preSale.groupBy({
    by: ["status"],
    where: { businessId: tenant.businessId, createdAt: { gte: from, lte: to }, ...(branchId ? { branchId } : {}) },
    _count: { _all: true },
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: { businessId: tenant.businessId, createdAt: { gte: from, lte: to }, ...(branchId ? { branchId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true, action: true, module: true, createdAt: true, user: { select: { email: true } }, branch: { select: { name: true } } },
  });

  const productHistory = await prisma.productHistory.findMany({
    where: { businessId: tenant.businessId, createdAt: { gte: from, lte: to }, ...(branchId ? { branchId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true, type: true, createdAt: true, product: { select: { name: true } }, user: { select: { email: true } } },
  });

  const soldIds = new Set(saleItems.map((item) => item.productId));
  const slowProducts = await prisma.product.findMany({
    where: {
      businessId: tenant.businessId,
      isActive: true,
      ...(soldIds.size ? { id: { notIn: Array.from(soldIds).slice(0, 1000) } } : {}),
    },
    take: 8,
    select: { id: true, name: true, category: { select: { name: true } } },
  });

  const totalSales = sales.reduce((sum, sale) => sum + decimalToNumber(sale.total), 0);
  const totalTickets = sales.length;
  const averageTicket = totalTickets ? totalSales / totalTickets : 0;
  const totalItems = saleItems.reduce((sum, item) => sum + decimalToNumber(item.quantityDecimal), 0);
  const estimatedProfit = totalSales * 0.28;

  const days: Array<{ label: string; total: number }> = [];
  for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    const key = dayKey(cursor);
    days.push({
      label: cursor.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
      total: sales.filter((sale) => dayKey(sale.createdAt) === key).reduce((sum, sale) => sum + decimalToNumber(sale.total), 0),
    });
  }

  const byPayment = Object.entries(sales.reduce<Record<string, number>>((acc, sale) => {
    acc[sale.paymentMethod] = (acc[sale.paymentMethod] ?? 0) + decimalToNumber(sale.total);
    return acc;
  }, {})).map(([label, value]) => ({ label: paymentLabels[label] ?? label, value }));

  const byBranch = Object.values(sales.reduce<Record<string, { label: string; total: number }>>((acc, sale) => {
    const key = sale.branchId ?? "sin-sucursal";
    acc[key] ??= { label: sale.branch?.name ?? "Sin sucursal", total: 0 };
    acc[key].total += decimalToNumber(sale.total);
    return acc;
  }, {})).sort((a, b) => b.total - a.total);

  const byCashier = Object.values(sales.reduce<Record<string, { label: string; total: number }>>((acc, sale) => {
    acc[sale.cashierId] ??= { label: sale.cashier.fullName ?? sale.cashier.email, total: 0 };
    acc[sale.cashierId].total += decimalToNumber(sale.total);
    return acc;
  }, {})).sort((a, b) => b.total - a.total);

  const byCategory = Object.values(saleItems.reduce<Record<string, { label: string; total: number }>>((acc, item) => {
    const key = item.product.categoryId ?? "sin-categoría";
    acc[key] ??= { label: item.product.category?.name ?? "Sin categoría", total: 0 };
    acc[key].total += decimalToNumber(item.subtotal);
    return acc;
  }, {})).sort((a, b) => b.total - a.total);

  const topProducts = Object.values(saleItems.reduce<Record<string, { label: string; quantity: number; total: number }>>((acc, item) => {
    acc[item.productId] ??= { label: item.product.name, quantity: 0, total: 0 };
    acc[item.productId].quantity += decimalToNumber(item.quantityDecimal);
    acc[item.productId].total += decimalToNumber(item.subtotal);
    return acc;
  }, {})).sort((a, b) => b.quantity - a.quantity);

  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}h`,
    total: sales.filter((sale) => sale.createdAt.getHours() === hour).reduce((sum, sale) => sum + decimalToNumber(sale.total), 0),
  }));
  const strongestHour = hourBuckets.reduce((best, item) => (item.total > best.total ? item : best), { label: "-", total: 0 });
  const strongestDay = days.reduce((best, item) => (item.total > best.total ? item : best), { label: "-", total: 0 });
  const criticalStock = lowStock.filter((item) => decimalToNumber(item.stock) <= decimalToNumber(item.lowStockAlert));
  const cashDifference = cashSessions.reduce((sum, session) => sum + Math.abs(decimalToNumber(session.differenceUsd)) + Math.abs(decimalToNumber(session.differenceBs) / 100), 0);
  const preSaleCounts = preSalesByStatus.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {});

  const exportQuery = new URLSearchParams({
    from: dateInput(from),
    to: dateInput(to),
    branchId: params.branchId ?? "ALL",
    cashierId: params.cashierId ?? "ALL",
    categoryId: params.categoryId ?? "ALL",
    paymentMethod: params.paymentMethod ?? "ALL",
  });

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Enterprise analytics</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Reportes avanzados</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consultas livianas con filtros reales y exportacion profesional.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["csv", "excel", "pdf"].map((format) => (
            <Button key={format} asChild variant="secondary" className="h-10">
              <Link href={`/reports/advanced/export?${exportQuery.toString()}&format=${format}`} target={format === "pdf" ? "_blank" : undefined}>
                <ArrowDownToLine className="size-4" />
                {format.toUpperCase()}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <Card className="p-3">
        <form className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <input name="from" type="date" defaultValue={dateInput(from)} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
          <input name="to" type="date" defaultValue={dateInput(to)} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
          <select name="branchId" defaultValue={params.branchId ?? "ALL"} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
            <option value="ALL">Todas las sucursales</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select name="cashierId" defaultValue={params.cashierId ?? "ALL"} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
            <option value="ALL">Todos los cajeros</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.fullName ?? user.email}</option>)}
          </select>
          <select name="categoryId" defaultValue={params.categoryId ?? "ALL"} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
            <option value="ALL">Todas las categorías</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <button className="h-10 rounded-lg bg-foreground px-3 text-sm font-semibold text-background">Aplicar</button>
        </form>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Ventas", money(totalSales, "USD"), TrendingUp],
          ["Tickets", String(totalTickets), Receipt],
          ["Ticket prom.", money(averageTicket, "USD"), Wallet],
          ["Utilidad est.", money(estimatedProfit, "USD"), BarChart3],
          ["Hora fuerte", strongestHour.label, Clock],
          ["Dia fuerte", strongestDay.label, BarChart3],
          ["Items", totalItems.toFixed(2), Package],
        ].map(([label, value, Icon]) => (
          <Card key={String(label)} className="flex items-start justify-between p-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{String(label)}</p>
              <p className="mt-2 text-lg font-semibold">{String(value)}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <Card className="p-4"><h2 className="text-sm font-semibold">Ventas por dia</h2><SalesLineChart data={days} /></Card>
        <Card className="p-4"><h2 className="text-sm font-semibold">Método de pago</h2><DonutChart data={byPayment.length ? byPayment : [{ label: "Sin ventas", value: 1 }]} /></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4"><h2 className="text-sm font-semibold">Sucursales</h2><CompactBarChart data={byBranch.slice(0, 8)} /></Card>
        <Card className="p-4"><h2 className="text-sm font-semibold">Cajeros</h2><CompactBarChart data={byCashier.slice(0, 8)} /></Card>
        <Card className="p-4"><h2 className="text-sm font-semibold">categorías</h2><CompactBarChart data={byCategory.slice(0, 8)} /></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ListCard title="Top productos" empty="Sin productos vendidos.">
          {topProducts.slice(0, 8).map((product, index) => (
            <Row key={product.label} label={`${index + 1}. ${product.label}`} value={`${product.quantity.toFixed(2)} - ${money(product.total, "USD")}`} />
          ))}
        </ListCard>
        <ListCard title="Productos lentos" empty="Sin productos lentos.">
          {slowProducts.map((product) => <Row key={product.id} label={product.name} value={product.category?.name ?? "Sin categoría"} />)}
        </ListCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ListCard title="Alertas operativas" empty="Sin alertas criticas.">
          {criticalStock.slice(0, 5).map((item) => <Row key={`${item.branch.name}-${item.product.name}`} label={`Bajo stock: ${item.product.name}`} value={`${decimalToNumber(item.stock)} en ${item.branch.name}`} />)}
          {cashDifference > 10 ? <Row label="Diferencia caja alta" value={money(cashDifference, "USD")} /> : null}
          {totalTickets === 0 ? <Row label="Sucursal sin ventas" value="No hay ventas en el periodo" /> : null}
        </ListCard>
        <ListCard title="Arqueo y caja" empty="Sin cajas en el periodo.">
          {cashSessions.map((session) => <Row key={session.id} label={`${session.branch?.name ?? "Caja"} - ${session.status}`} value={`Dif ${money(decimalToNumber(session.differenceUsd), "USD")}`} />)}
        </ListCard>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Preventas</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniKpi label="Total" value={Object.values(preSaleCounts).reduce((a, b) => a + b, 0)} />
            <MiniKpi label="Pagadas" value={preSaleCounts.PAID ?? 0} />
            <MiniKpi label="Canceladas" value={preSaleCounts.CANCELLED ?? 0} />
          </div>
        </Card>
      </div>

      <ListCard title="Transferencias internas" empty="Sin transferencias en el periodo.">
        {transfers.map((transfer) => (
          <Row key={transfer.id} label={`${transfer.fromBranch.name} -> ${transfer.toBranch.name}`} value={`${transfer._count.items} items - ${transfer.status}`} />
        ))}
      </ListCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ListCard title="Auditoria operativa" empty="Sin eventos recientes.">
          {auditLogs.map((log) => (
            <Row key={log.id} icon={<ShieldCheck className="size-4 text-primary" />} label={`${log.action} - ${log.module}`} value={`${log.user?.email ?? "Sistema"} - ${log.createdAt.toLocaleString("es-CL")}`} />
          ))}
        </ListCard>
        <ListCard title="Historial productos" empty="Sin cambios recientes.">
          {productHistory.map((history) => (
            <Row key={history.id} label={`${history.product.name} - ${history.type}`} value={`${history.user?.email ?? "Sistema"} - ${history.createdAt.toLocaleString("es-CL")}`} />
          ))}
        </ListCard>
      </div>
    </section>
  );
}

function ListCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b p-3"><h2 className="text-sm font-semibold">{title}</h2></div>
      {children}
      {Array.isArray(children) && children.filter(Boolean).length === 0 ? <div className="p-3 text-sm text-muted-foreground">{empty}</div> : null}
    </Card>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b p-3 text-sm last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate font-semibold">{label}</span>
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{value}</span>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
