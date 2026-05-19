import { Card } from "@/components/ui/card";
import { billingPaymentLabels, enrichBusiness, getAdminBusinesses, statusClass, usd } from "@/features/admin/admin-data";
import { markPaymentReceivedAction, renewBusinessAction, extendTrialAction } from "@/features/admin/billing-actions";

export default async function AdminBillingPage() {
  const rows = (await getAdminBusinesses()).map(enrichBusiness);
  const invoices = rows
    .map((row) => ({
      id: row.business.id,
      business: row.business.name,
      status: row.effectiveStatus,
      amount: row.monthlyValue,
      date: row.business.nextPaymentAt ?? row.business.trialEnd,
      method: row.business.billingPaymentMethod,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Renewals</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">Facturación</h1>
        <p className="mt-1 text-sm text-muted-foreground">Renovaciones, pagos manuales y estructura lista para PDF futuro.</p>
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_1fr_1.7fr] gap-3 border-b bg-muted/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span>Negocio</span><span>Estado</span><span>Monto</span><span>Fecha</span><span>Método</span><span>Acciones</span>
        </div>
        {invoices.map((invoice) => (
          <div key={invoice.id} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_1fr_1.7fr] items-center gap-3 border-b px-3 py-3 text-sm last:border-b-0">
            <p className="font-semibold">{invoice.business}</p>
            <span className={`w-fit rounded-lg px-2 py-1 text-xs font-semibold ${statusClass(invoice.status)}`}>{invoice.status}</span>
            <p className="font-semibold">{usd(invoice.amount)}</p>
            <p className="text-xs">{invoice.date.toLocaleDateString("es-CL")}</p>
            <p className="text-xs font-semibold">{invoice.method ? billingPaymentLabels[invoice.method] : "Sin Método"}</p>
            <div className="flex flex-wrap gap-1">
              <form action={markPaymentReceivedAction}><input type="hidden" name="businessId" value={invoice.id} /><input type="hidden" name="method" value={invoice.method ?? "PAGO_MOVIL"} /><button className="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">Pagado</button></form>
              <form action={renewBusinessAction}><input type="hidden" name="businessId" value={invoice.id} /><input type="hidden" name="method" value={invoice.method ?? "PAGO_MOVIL"} /><button className="rounded-lg bg-muted px-2 py-1 text-xs font-medium">Renovar</button></form>
              <form action={extendTrialAction}><input type="hidden" name="businessId" value={invoice.id} /><input type="hidden" name="days" value="7" /><button className="rounded-lg bg-muted px-2 py-1 text-xs font-medium">+7 días</button></form>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}
