import { MoreHorizontal, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ModalTrigger } from "@/components/shared/modal-trigger";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  activateBusinessAction,
  cancelBusinessAction,
  changePlanAction,
  extendTrialAction,
  markPaymentReceivedAction,
  renewBusinessAction,
  suspendBusinessAction,
} from "@/features/admin/billing-actions";
import { createAdminBusinessAction } from "@/features/admin/admin-config-actions";
import { billingPaymentLabels, enrichBusiness, getAdminBusinesses, statusClass } from "@/features/admin/admin-data";
import { getDynamicPlans } from "@/features/billing/plan-service";
import { normalizeCommercialPlan } from "@/features/billing/plans";

function BusinessCard({
  row,
  plans,
}: {
  row: ReturnType<typeof enrichBusiness>;
  plans: Awaited<ReturnType<typeof getDynamicPlans>>;
}) {
  const nextDate = row.business.nextPaymentAt ?? row.business.trialEnd;

  return (
    <Card className="overflow-hidden p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{row.business.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.owner?.email ?? row.business.email ?? "sin email"}</p>
        </div>
        <ActionsMenu row={row} plans={plans} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Info label="Plan" value={row.business.subscriptionPlan?.name ?? normalizeCommercialPlan(row.business.plan)} />
        <div className="rounded-lg bg-muted/55 p-2">
          <p className="font-medium text-muted-foreground">Estado</p>
          <span className={`mt-0.5 inline-flex rounded-lg px-2 py-1 font-semibold ${statusClass(row.effectiveStatus)}`}>{row.effectiveStatus}</span>
        </div>
        <Info label="Trial" value={row.trialDays >= 0 ? `${row.trialDays} días` : "vencido"} />
        <Info label="Cobro" value={nextDate.toLocaleDateString("es-CL")} />
        <Info label="Método" value={billingPaymentLabels[row.business.billingPaymentMethod as keyof typeof billingPaymentLabels] ?? "Sin método"} />
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/55 p-2">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function BusinessFile({ row }: { row: ReturnType<typeof enrichBusiness> }) {
  const nextDate = row.business.nextPaymentAt ?? row.business.trialEnd;
  const fields = [
    ["Nombre", row.business.name],
    ["RIF/RUT", "No configurado"],
    ["Correo", row.business.email ?? row.owner?.email ?? "Sin email"],
    ["Dirección", row.business.address ?? "No configurada"],
    ["Usuarios", String(row.business.users.length)],
    ["Sucursales", "1"],
    ["Creado", row.business.createdAt.toLocaleDateString("es-CL")],
    ["Plan", row.business.subscriptionPlan?.name ?? normalizeCommercialPlan(row.business.plan)],
    ["Trial", row.trialDays >= 0 ? `${row.trialDays} días` : "vencido"],
    ["Próximo cobro", nextDate.toLocaleDateString("es-CL")],
    ["Moneda", row.business.currency],
    ["Estado", row.effectiveStatus],
  ];

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-muted/35 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
        </div>
      ))}
      <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground sm:col-span-2">
        Entrar al negocio
      </button>
    </div>
  );
}

function ActionsMenu({ row, plans }: { row: ReturnType<typeof enrichBusiness>; plans: Awaited<ReturnType<typeof getDynamicPlans>> }) {
  return (
    <details className="relative">
      <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg border bg-background hover:bg-muted">
        <MoreHorizontal className="size-4" />
      </summary>
      <div className="absolute right-0 top-10 z-30 w-56 rounded-lg border bg-card p-1.5 shadow-[0_18px_50px_hsl(220_20%_10%/0.18)]">
        <ModalTrigger title={row.business.name} description="Ficha negocio" size="lg" trigger={<span className="block cursor-pointer rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-muted">Ficha negocio</span>}>
          <BusinessFile row={row} />
        </ModalTrigger>
        <form action={changePlanAction} className="grid gap-1 border-t p-2">
          <input type="hidden" name="businessId" value={row.business.id} />
          <select name="planId" defaultValue={row.business.planId ?? ""} className="h-8 rounded-lg border bg-background px-2 text-xs font-medium">
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
          <SubmitButton variant="secondary" className="h-8 justify-start rounded-lg px-2 py-2 text-left text-xs font-medium" pendingText="Cambiando...">Cambiar plan</SubmitButton>
        </form>
        <form action={markPaymentReceivedAction} className="grid gap-1 border-t p-2">
          <input type="hidden" name="businessId" value={row.business.id} />
          <select name="method" defaultValue={row.business.billingPaymentMethod ?? "PAGO_MOVIL"} className="h-8 rounded-lg border bg-background px-2 text-xs font-medium">
            {Object.entries(billingPaymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <SubmitButton className="h-8 justify-start rounded-lg bg-primary px-2 py-2 text-left text-xs font-medium text-primary-foreground" pendingText="Marcando...">Marcar pago</SubmitButton>
        </form>
        <form action={renewBusinessAction}><input type="hidden" name="businessId" value={row.business.id} /><input type="hidden" name="method" value={row.business.billingPaymentMethod ?? "PAGO_MOVIL"} /><SubmitButton variant="ghost" className="block h-auto w-full rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-muted">Renovar</SubmitButton></form>
        <form action={extendTrialAction}><input type="hidden" name="businessId" value={row.business.id} /><input type="hidden" name="days" value="7" /><SubmitButton variant="ghost" className="block h-auto w-full rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-muted">Extender trial</SubmitButton></form>
        <form action={suspendBusinessAction}><input type="hidden" name="businessId" value={row.business.id} /><SubmitButton variant="ghost" className="block h-auto w-full rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-destructive/10 hover:text-destructive">Suspender</SubmitButton></form>
        <form action={activateBusinessAction}><input type="hidden" name="businessId" value={row.business.id} /><SubmitButton variant="ghost" className="block h-auto w-full rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-accent hover:text-accent-foreground">Activar</SubmitButton></form>
        <form action={cancelBusinessAction}><input type="hidden" name="businessId" value={row.business.id} /><SubmitButton variant="ghost" className="block h-auto w-full rounded-lg px-2 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10">Eliminar</SubmitButton></form>
      </div>
    </details>
  );
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; plan?: string }>;
}) {
  const query = await searchParams;
  const businesses = (await getAdminBusinesses()).map(enrichBusiness);
  const adminPlans = await getDynamicPlans();
  const search = (query.q ?? "").toLowerCase().trim();

  const filtered = businesses.filter((row) => {
    const matchesSearch =
      !search ||
      row.business.name.toLowerCase().includes(search) ||
      row.business.email?.toLowerCase().includes(search) ||
      row.owner?.email.toLowerCase().includes(search);
    const matchesStatus = !query.status || query.status === "ALL" || row.effectiveStatus === query.status;
    const matchesPlan = !query.plan || query.plan === "ALL" || row.plan === query.plan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">SaaS CRM</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Negocios</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} cuentas comerciales.</p>
        </div>
        <ModalTrigger title="Crear negocio" size="xl" trigger={<span className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Crear negocio</span>}>
          <form action={createAdminBusinessAction} className="grid gap-3 p-4 md:grid-cols-2">
            <input name="name" placeholder="Nombre negocio" required className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="slug" placeholder="Slug opcional" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="ownerName" placeholder="Nombre dueño" required className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="ownerEmail" type="email" placeholder="Email dueño" required className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="phone" placeholder="Teléfono" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="country" placeholder="País" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <select name="currency" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium"><option>USD</option><option>BS</option><option>CLP</option></select>
            <select name="planId" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
              {adminPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
            <input name="trial" type="number" defaultValue="30" placeholder="Trial días" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <input name="trialEnd" type="date" className="h-10 rounded-lg border bg-background px-3 text-sm" />
            <select name="method" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
              {Object.entries(billingPaymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select name="status" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium"><option value="TRIAL">Trial</option><option value="ACTIVE">Activo</option><option value="SUSPENDED">Suspendido</option></select>
            <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium"><input name="createOwner" type="checkbox" defaultChecked className="size-4 accent-primary" /> Crear dueño automáticamente</label>
            <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium"><input name="activateNow" type="checkbox" defaultChecked className="size-4 accent-primary" /> Activar inmediatamente</label>
            <SubmitButton className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground md:col-span-2" pendingText="Creando...">Crear negocio</SubmitButton>
          </form>
        </ModalTrigger>
      </div>

      <Card className="p-3">
        <form className="grid gap-2 md:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={query.q} placeholder="Buscar negocio, dueño o email..." className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <select name="status" defaultValue={query.status ?? "ALL"} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
            <option value="ALL">Todos los estados</option>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Activo</option>
            <option value="PAST_DUE">Vencido</option>
            <option value="SUSPENDED">Suspendido</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <select name="plan" defaultValue={query.plan ?? "ALL"} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
            <option value="ALL">Todos los planes</option>
            {adminPlans.map((plan) => <option key={plan.id} value={plan.slug}>{plan.name}</option>)}
          </select>
          <button className="h-10 rounded-lg bg-foreground px-4 text-sm font-semibold text-background">Filtrar</button>
        </form>
      </Card>

      <div className="grid gap-2 lg:hidden">
        {filtered.map((row) => <BusinessCard key={row.business.id} row={row} plans={adminPlans} />)}
      </div>

      <Card className="hidden overflow-visible lg:block">
        <div className="grid grid-cols-[1.65fr_0.75fr_0.65fr_0.8fr_0.95fr_0.72fr_0.36fr] gap-3 border-b bg-muted/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span>Negocio</span>
          <span>Plan</span>
          <span>Trial</span>
          <span>Cobro</span>
          <span>Método</span>
          <span>Estado</span>
          <span></span>
        </div>
        {filtered.map((row) => {
          const nextDate = row.business.nextPaymentAt ?? row.business.trialEnd;
          return (
            <div key={row.business.id} className="grid grid-cols-[1.65fr_0.75fr_0.65fr_0.8fr_0.95fr_0.72fr_0.36fr] items-center gap-3 border-b px-3 py-3 text-sm last:border-b-0">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{row.business.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.owner?.email ?? row.business.email ?? "sin email"}</p>
              </div>
              <span className="w-fit rounded-lg bg-muted px-2 py-1 text-xs font-semibold">{row.business.subscriptionPlan?.name ?? normalizeCommercialPlan(row.business.plan)}</span>
              <p className="text-xs font-medium">{row.trialDays >= 0 ? `${row.trialDays} días` : "vencido"}</p>
              <p className="text-xs">{nextDate.toLocaleDateString("es-CL")}</p>
              <p className="truncate text-xs font-medium">{billingPaymentLabels[row.business.billingPaymentMethod as keyof typeof billingPaymentLabels] ?? "Sin método"}</p>
              <span className={`w-fit rounded-lg px-2 py-1 text-xs font-semibold ${statusClass(row.effectiveStatus)}`}>{row.effectiveStatus}</span>
              <ActionsMenu row={row} plans={adminPlans} />
            </div>
          );
        })}
      </Card>
    </section>
  );
}
