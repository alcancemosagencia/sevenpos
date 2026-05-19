import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ModalTrigger } from "@/components/shared/modal-trigger";
import { billingPaymentLabels, enrichBusiness, getAdminBusinesses, usd } from "@/features/admin/admin-data";
import { registerAdminPaymentAction } from "@/features/admin/admin-config-actions";
import { getAdminPayments } from "@/features/admin/admin-store";

export default async function AdminAccountingPage() {
  const rows = (await getAdminBusinesses()).map(enrichBusiness);
  const payments = await getAdminPayments();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const received = payments.filter((payment) => new Date(payment.paidAt) >= monthStart);
  const pending = rows.filter((row) => row.effectiveStatus === "TRIAL" || row.effectiveStatus === "ACTIVE");
  const overdue = rows.filter((row) => row.effectiveStatus === "PAST_DUE");
  const renewals = rows.filter((row) => row.business.nextPaymentAt && row.business.nextPaymentAt >= monthStart);
  const receivedTotal = received.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">SaaS finance</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Contabilidad</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pagos del SaaS y renovaciones comerciales.</p>
        </div>
        <ModalTrigger
          title="Registrar pago"
          size="xl"
          trigger={(
            <span className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <Plus className="size-4" /> Registrar pago
            </span>
          )}
        >
              <form action={registerAdminPaymentAction} className="grid gap-3 p-4 md:grid-cols-2">
                <select name="businessId" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium md:col-span-2">
                  {rows.map((row) => (
                    <option key={row.business.id} value={row.business.id}>{row.business.name} - {row.owner?.email ?? "sin Dueño"}</option>
                  ))}
                </select>
                <input name="ownerName" placeholder="Dueño" className="h-10 rounded-lg border bg-background px-3 text-sm" />
                <input name="ownerEmail" placeholder="Email Dueño" className="h-10 rounded-lg border bg-background px-3 text-sm" />
                <select name="plan" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium"><option>STARTER</option><option>BUSINESS</option><option>PREMIUM</option></select>
                <input name="amount" type="number" step="0.01" placeholder="Monto" className="h-10 rounded-lg border bg-background px-3 text-sm" />
                <select name="currency" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium"><option>USD</option><option>BS</option><option>CLP</option></select>
                <select name="method" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
                  {Object.entries(billingPaymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input name="reference" placeholder="Referencia" className="h-10 rounded-lg border bg-background px-3 text-sm" />
                <input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-10 rounded-lg border bg-background px-3 text-sm" />
                <input name="nextDueAt" type="date" className="h-10 rounded-lg border bg-background px-3 text-sm" />
                <textarea name="notes" placeholder="Observaciones" className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-2" />
                <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground md:col-span-2">Guardar pago y renovar</button>
              </form>
        </ModalTrigger>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {[["Ingresos mensuales", usd(receivedTotal)], ["Pagos recibidos", received.length], ["Pagos pendientes", pending.length], ["Vencidos", overdue.length], ["Renovaciones", renewals.length]].map(([label, value]) => (
          <Card key={label} className="p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.9fr_0.9fr_1fr_1fr] gap-3 border-b bg-muted/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span>Negocio</span><span>Método</span><span>Monto</span><span>Referencia</span><span>Fecha</span><span>Admin</span><span>Notas</span>
        </div>
        {payments.length ? payments.map((payment) => (
          <div key={payment.id} className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.9fr_0.9fr_1fr_1fr] gap-3 border-b px-3 py-3 text-sm last:border-b-0">
            <div><p className="font-semibold">{payment.businessName}</p><p className="text-xs text-muted-foreground">{payment.ownerEmail}</p></div>
            <p className="font-semibold">{billingPaymentLabels[payment.method as keyof typeof billingPaymentLabels] ?? payment.method}</p>
            <p className="font-semibold">{payment.currency} {payment.amount.toFixed(2)}</p>
            <p className="text-xs">{payment.reference || "-"}</p>
            <p className="text-xs">{new Date(payment.paidAt).toLocaleDateString("es-CL")}</p>
            <p className="text-xs">{payment.operator}</p>
            <p className="text-xs text-muted-foreground">{payment.notes || "-"}</p>
          </div>
        )) : <div className="p-6 text-center text-sm text-muted-foreground">No hay pagos registrados.</div>}
      </Card>
    </section>
  );
}
