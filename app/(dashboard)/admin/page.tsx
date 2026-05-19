import { Building2, Clock3, CreditCard, DollarSign, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { enrichBusiness, getAdminBusinesses, usd, statusClass } from "@/features/admin/admin-data";

export default async function AdminDashboardPage() {
  const businesses = await getAdminBusinesses();
  const rows = businesses.map(enrichBusiness);
  const active = rows.filter((row) => row.effectiveStatus === "ACTIVE").length;
  const suspended = rows.filter((row) => row.effectiveStatus === "SUSPENDED").length;
  const trials = rows.filter((row) => row.effectiveStatus === "TRIAL").length;
  const upcoming = rows.filter((row) => row.effectiveStatus === "TRIAL" && row.trialDays <= 7).length;
  const mrr = rows.reduce((sum, row) => sum + row.monthlyValue, 0);
  const arr = mrr * 12;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const paymentsThisMonth = rows.filter((row) => row.business.lastPaymentAt && row.business.lastPaymentAt >= monthStart);
  const revenueThisMonth = paymentsThisMonth.reduce((sum, row) => sum + row.monthlyValue, 0);
  const churn = businesses.length ? Math.round((rows.filter((row) => row.effectiveStatus === "CANCELLED").length / businesses.length) * 100) : 0;
  const salesProcessed = rows.reduce((sum, row) => sum + row.salesProcessed, 0);
  const usersRegistered = rows.reduce((sum, row) => sum + row.business.users.length, 0);
  const previousMonthCount = rows.filter((row) => row.business.createdAt < monthStart).length;
  const growth = previousMonthCount ? Math.round(((businesses.length - previousMonthCount) / previousMonthCount) * 100) : businesses.length ? 100 : 0;

  const metrics = [
    { label: "MRR", value: usd(mrr), icon: DollarSign },
    { label: "ARR", value: usd(arr), icon: TrendingUp },
    { label: "Activos", value: active, icon: Building2 },
    { label: "Suspendidos", value: suspended, icon: CreditCard },
    { label: "Trials", value: trials, icon: Clock3 },
    { label: "Vencen pronto", value: upcoming, icon: Clock3 },
    { label: "Ingresos mes", value: usd(revenueThisMonth), icon: DollarSign },
    { label: "Churn", value: `${churn}%`, icon: TrendingUp },
    { label: "Crecimiento", value: `${growth}%`, icon: TrendingUp },
    { label: "Ventas procesadas", value: usd(salesProcessed), icon: CreditCard },
    { label: "Usuarios", value: usersRegistered, icon: Users },
  ];

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">SaaS Command Center</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Control comercial global de SevenPOS.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold">{metric.value}</p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <metric.icon className="size-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="border-b px-3 py-3">
            <h2 className="text-sm font-semibold">Ultimos negocios</h2>
          </div>
          {rows.slice(0, 6).map((row) => (
            <div key={row.business.id} className="flex items-center justify-between gap-3 border-b px-3 py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.business.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.owner?.email ?? row.business.email ?? "sin Dueño"}</p>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass(row.effectiveStatus)}`}>{row.effectiveStatus}</span>
            </div>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b px-3 py-3">
            <h2 className="text-sm font-semibold">Ultimos pagos</h2>
          </div>
          {rows.filter((row) => row.business.lastPaymentAt).slice(0, 6).map((row) => (
            <div key={row.business.id} className="flex items-center justify-between gap-3 border-b px-3 py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{row.business.name}</p>
                <p className="text-xs text-muted-foreground">{row.business.lastPaymentAt?.toLocaleDateString("es-CL")}</p>
              </div>
              <p className="text-sm font-semibold">{usd(row.monthlyValue)}</p>
            </div>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b px-3 py-3">
            <h2 className="text-sm font-semibold">Ultimos vencimientos</h2>
          </div>
          {rows
            .filter((row) => row.effectiveStatus === "TRIAL" || row.business.nextPaymentAt)
            .sort((a, b) => (a.business.nextPaymentAt ?? a.business.trialEnd).getTime() - (b.business.nextPaymentAt ?? b.business.trialEnd).getTime())
            .slice(0, 6)
            .map((row) => (
              <div key={row.business.id} className="flex items-center justify-between gap-3 border-b px-3 py-2.5 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{row.business.name}</p>
                  <p className="text-xs text-muted-foreground">{row.trialDays >= 0 ? `${row.trialDays} días restantes` : "vencido"}</p>
                </div>
                <p className="text-xs font-medium">{(row.business.nextPaymentAt ?? row.business.trialEnd).toLocaleDateString("es-CL")}</p>
              </div>
            ))}
        </Card>
      </div>
    </section>
  );
}
