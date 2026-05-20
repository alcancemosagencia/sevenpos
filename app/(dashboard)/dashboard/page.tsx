import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Boxes,
  CreditCard,
  DollarSign,
  ListChecks,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { getOpenCashSessionSummary } from "@/features/cash/queries";
import { cashMovementSignedAmounts, decimalToNumber as cashDecimalToNumber } from "@/features/cash/utils";
import { FadeIn, MetricValue } from "@/features/dashboard/dashboard-client";
import { decimalToNumber, money } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

const paymentLabels = {
  CASH_USD: "Efectivo USD",
  CASH_BS: "Efectivo Bs",
  MOBILE_PAYMENT: "Pago móvil",
  BANK_TRANSFER: "Transferencia",
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function decimalOrZero(value: { toString(): string } | null | undefined) {
  return value ? decimalToNumber(value) : 0;
}

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon: React.ElementType;
  delay?: number;
};

function StatCard({ label, value, detail, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <FadeIn delay={delay}>
      <Card className="group p-4 shadow-[0_1px_2px_hsl(220_20%_10%/0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_26px_hsl(220_20%_10%/0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">{label}</p>
            <div className="mt-2">
              <MetricValue>{value}</MetricValue>
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{detail}</p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-4" />
          </div>
        </div>
      </Card>
    </FadeIn>
  );
}

export default async function DashboardPage() {
  const tenant = await requireTenantContext();

  if (!tenant.businessId || !tenant.currentBusiness) {
    return null;
  }

  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const businessId = tenant.businessId;

  const todaySalesAggregate = await prisma.sale.aggregate({
    where: { businessId, createdAt: { gte: today } },
    _sum: { total: true },
    _count: { _all: true },
  });

  const weekSalesAggregate = await prisma.sale.aggregate({
    where: { businessId, createdAt: { gte: week } },
    _sum: { total: true },
  });

  const totalTransactions = await prisma.sale.count({ where: { businessId } });
  const activeProducts = await prisma.product.count({ where: { businessId, isActive: true } });
  const lowStockProducts = await prisma.product.count({
    where: {
      businessId,
      isActive: true,
      stock: { lte: prisma.product.fields.lowStockAlert },
    },
  });

  const recentSales = await prisma.sale.findMany({
    where: { businessId },
    select: {
      id: true,
      total: true,
      currency: true,
      paymentMethod: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const paymentGroups = await prisma.sale.groupBy({
    by: ["paymentMethod"],
    where: { businessId },
    _count: { paymentMethod: true },
    orderBy: { _count: { paymentMethod: "desc" } },
    take: 1,
  });

  const openCashSession = await getOpenCashSessionSummary(businessId);

  const lastClosedCashSession = await prisma.cashSession.findFirst({
    where: { businessId, status: "CLOSED" },
    orderBy: { closedAt: "desc" },
    select: { differenceUsd: true, differenceBs: true, closedAt: true },
  });

  const todayCashMovements = await prisma.cashMovement.findMany({
    where: { businessId, createdAt: { gte: today } },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, amountUsd: true, amountBs: true, note: true, createdAt: true },
    take: 8,
  });

  const todayTotal = decimalOrZero(todaySalesAggregate._sum.total);
  const weekTotal = decimalOrZero(weekSalesAggregate._sum.total);
  const todayTransactions = todaySalesAggregate._count._all;
  const averageTicket = todayTransactions > 0 ? todayTotal / todayTransactions : 0;
  const topPayment = paymentGroups[0]?.paymentMethod
    ? paymentLabels[paymentGroups[0].paymentMethod]
    : "Sin ventas";
  const todayMovementTotals = todayCashMovements.reduce(
    (totals, movement) => {
      const signed = cashMovementSignedAmounts(
        movement.type,
        cashDecimalToNumber(movement.amountUsd),
        cashDecimalToNumber(movement.amountBs),
      );
      return {
        usd: totals.usd + signed.usd,
        bs: totals.bs + signed.bs,
      };
    },
    { usd: 0, bs: 0 },
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {formatDateLabel(now)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground sm:text-[28px]">
            {tenant.currentBusiness.name}
          </h1>
        </div>
        <Link
          href="/pos"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-[0_10px_24px_hsl(218_92%_35%/0.20)] transition hover:bg-primary/90"
        >
          Abrir POS
          <ArrowUpRight className="size-4" />
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas hoy" value={money(todayTotal, "USD")} detail={`${todayTransactions} transacciones`} icon={DollarSign} />
        <StatCard label="Semana" value={money(weekTotal, "USD")} detail="ventas acumuladas" icon={TrendingUp} delay={0.03} />
        <StatCard label="Ticket promedio" value={money(averageTicket, "USD")} detail="promedio de hoy" icon={Receipt} delay={0.06} />
        <StatCard label="Productos activos" value={activeProducts} detail={`${lowStockProducts} bajo stock`} icon={Boxes} delay={0.09} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_360px]">
        <FadeIn delay={0.12}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Ultimas ventas</h2>
                <p className="text-xs text-muted-foreground">Actividad reciente del negocio</p>
              </div>
              <Link href="/reports" className="text-xs font-medium text-primary">
                Ver todas
              </Link>
            </div>
            <div className="divide-y">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/40">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <CreditCard className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {sale._count.items} producto{sale._count.items === 1 ? "" : "s"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {paymentLabels[sale.paymentMethod]} - {formatTime(sale.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{money(decimalToNumber(sale.total), sale.currency === "BS" ? "VES" : "USD")}</p>
                  </div>
                ))
              ) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Receipt className="size-5" />
                  </div>
                  <p className="text-sm font-medium">Sin ventas todavia</p>
                  <p className="mt-1 text-xs text-muted-foreground">Las transacciones apareceran aqui.</p>
                </div>
              )}
            </div>
          </Card>
        </FadeIn>

        <div className="grid gap-3">
          <FadeIn delay={0.13}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Caja actual</p>
                  <p className="mt-2 text-xl font-semibold tracking-normal">{openCashSession ? "Abierta" : "Cerrada"}</p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    {openCashSession
                      ? `${money(openCashSession.expectedUsd, "USD")} / ${money(openCashSession.expectedBs, "VES")}`
                      : "Abre caja para vender"}
                  </p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Wallet className="size-4" />
                </div>
              </div>
            </Card>
          </FadeIn>

          <FadeIn delay={0.15}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Tasa del dia</p>
                  <p className="mt-2 text-xl font-semibold tracking-normal">1 USD = {tenant.currentBusiness.exchangeRate} Bs</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Banknote className="size-4" />
                </div>
              </div>
            </Card>
          </FadeIn>

          <FadeIn delay={0.18}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Método top</p>
                  <p className="mt-2 text-xl font-semibold tracking-normal">{topPayment}</p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">{totalTransactions} transacciones totales</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <CreditCard className="size-4" />
                </div>
              </div>
            </Card>
          </FadeIn>

          <FadeIn delay={0.21}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Bajo stock</p>
                  <p className="mt-2 text-xl font-semibold tracking-normal">{lowStockProducts}</p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">{lowStockProducts > 0 ? "Revisar inventario" : "Sin alertas"}</p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <AlertTriangle className="size-4" />
                </div>
              </div>
            </Card>
          </FadeIn>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[360px_1fr]">
        <FadeIn delay={0.24}>
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-muted-foreground">Ultimo cierre</p>
                <p className="mt-2 text-xl font-semibold tracking-normal">
                  {lastClosedCashSession ? `${money(cashDecimalToNumber(lastClosedCashSession.differenceUsd), "USD")}` : "Sin cierres"}
                </p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  {lastClosedCashSession
                    ? `Diferencia Bs ${money(cashDecimalToNumber(lastClosedCashSession.differenceBs), "VES")}`
                    : "Cierra caja al terminar turno"}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <ListChecks className="size-4" />
              </div>
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.27}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Movimientos de caja</h2>
                <p className="text-xs text-muted-foreground">
                  Neto hoy {money(todayMovementTotals.usd, "USD")} / {money(todayMovementTotals.bs, "VES")}
                </p>
              </div>
            </div>
            <div className="divide-y">
              {todayCashMovements.length > 0 ? (
                todayCashMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{movement.note ?? movement.type}</p>
                      <p className="text-xs text-muted-foreground">{movement.type} - {formatTime(movement.createdAt)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {money(cashDecimalToNumber(movement.amountUsd), "USD")} / {money(cashDecimalToNumber(movement.amountBs), "VES")}
                    </p>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium">Sin movimientos hoy</p>
                  <p className="mt-1 text-xs text-muted-foreground">Apertura, ventas y gastos apareceran aqui.</p>
                </div>
              )}
            </div>
          </Card>
        </FadeIn>
      </section>
    </div>
  );
}
