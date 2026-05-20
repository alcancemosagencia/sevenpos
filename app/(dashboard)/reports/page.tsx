import Link from "next/link";
import { BarChart3, Package, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppEmptyState } from "@/components/shared/app-states";
import { decimalToNumber, money } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

const paymentLabels = {
  CASH_USD: "Efectivo USD",
  CASH_BS: "Efectivo Bs",
  MOBILE_PAYMENT: "Pago móvil",
  BANK_TRANSFER: "Transferencia",
};

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export default async function ReportsPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const today = startOfDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const sales = await prisma.sale.findMany({
    where: { businessId: tenant.businessId, createdAt: { gte: weekStart } },
    select: {
      id: true,
      total: true,
      paymentMethod: true,
      createdAt: true,
      items: { select: { productId: true, quantity: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: 1200,
  });
  const expenses = await prisma.expense.findMany({
    where: { businessId: tenant.businessId, createdAt: { gte: weekStart } },
    select: { amount: true },
    take: 1200,
  });

  const todaySales = sales.filter((sale) => sale.createdAt >= today);
  const todayTotal = todaySales.reduce((sum, sale) => sum + decimalToNumber(sale.total), 0);
  const weekTotal = sales.reduce((sum, sale) => sum + decimalToNumber(sale.total), 0);
  const expensesTotal = expenses.reduce((sum, expense) => sum + decimalToNumber(expense.amount), 0);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const total = sales
      .filter((sale) => sale.createdAt.toDateString() === date.toDateString())
      .reduce((sum, sale) => sum + decimalToNumber(sale.total), 0);
    return {
      label: date.toLocaleDateString("es-CL", { weekday: "short" }),
      total,
    };
  });
  const maxDay = Math.max(...days.map((day) => day.total), 1);

  const byPayment = sales.reduce<Record<string, number>>((acc, sale) => {
    acc[sale.paymentMethod] = (acc[sale.paymentMethod] ?? 0) + decimalToNumber(sale.total);
    return acc;
  }, {});

  const topProducts = sales
    .flatMap((sale) => sale.items)
    .reduce<Record<string, { name: string; quantity: number }>>((acc, item) => {
      const current = acc[item.productId] ?? { name: item.product.name, quantity: 0 };
      current.quantity += item.quantity;
      acc[item.productId] = current;
      return acc;
    }, {});

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Reportes</h1>
          <p className="text-sm text-muted-foreground">Resumen del negocio</p>
        </div>
        <Button asChild variant="secondary" className="h-10">
          <Link href="/reports/advanced">
            <BarChart3 className="size-4" />
            Avanzado
          </Link>
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Hoy", money(todayTotal, "USD"), Wallet],
          ["Esta semana", money(weekTotal, "USD"), TrendingUp],
          ["Transacciones", String(sales.length), Package],
          ["Gastos total", money(expensesTotal, "USD"), BarChart3],
        ].map(([label, value, Icon]) => (
          <Card key={label as string} className="flex items-start justify-between p-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label as string}</p>
              <p className="mt-2 text-xl font-semibold">{value as string}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Ventas ultimos 7 días</h2>
        <div className="mt-4 flex h-44 items-end gap-3">
          {days.map((day) => (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-36 w-full items-end justify-center">
                <div className="w-full max-w-16 rounded-t-lg bg-primary" style={{ height: `${Math.max(8, (day.total / maxDay) * 100)}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b p-3">
          <h2 className="text-sm font-semibold">Por Método de pago</h2>
        </div>
        {Object.entries(byPayment).length ? (
          Object.entries(byPayment).map(([method, total]) => (
            <div key={method} className="flex items-center justify-between border-b p-3 last:border-b-0">
              <span className="text-sm text-muted-foreground">{paymentLabels[method as keyof typeof paymentLabels]}</span>
              <span className="text-sm font-semibold">{money(total, "USD")}</span>
            </div>
          ))
        ) : (
          <div className="p-3">
            <AppEmptyState className="min-h-32 border-0 shadow-none" title="Sin ventas en el período" />
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b p-3">
          <h2 className="text-sm font-semibold">Productos mas vendidos</h2>
        </div>
        {Object.values(topProducts).length ? (
          Object.values(topProducts)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)
            .map((product, index) => (
              <div key={product.name} className="flex items-center justify-between border-b p-3 last:border-b-0">
                <span className="text-sm">
                  <span className="mr-3 text-muted-foreground">{index + 1}</span>
                  {product.name}
                </span>
                <span className="text-sm font-semibold">{product.quantity} uds</span>
              </div>
            ))
        ) : (
          <div className="p-3">
            <AppEmptyState className="min-h-32 border-0 shadow-none" title="Sin productos vendidos" />
          </div>
        )}
      </Card>
    </section>
  );
}
