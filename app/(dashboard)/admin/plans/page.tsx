import { CheckCircle2, MoreHorizontal, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ModalTrigger } from "@/components/shared/modal-trigger";
import { SubmitButton } from "@/components/shared/submit-button";
import { deletePlanAction, savePlanAction, togglePlanStatusAction } from "@/features/admin/admin-config-actions";
import { moduleKeys } from "@/features/admin/admin-modules";
import { getDynamicPlans, type DynamicPlan } from "@/features/billing/plan-service";

function PlanForm({ plan }: { plan?: DynamicPlan }) {
  return (
    <form action={savePlanAction} className="space-y-3 p-4">
      {plan ? <input type="hidden" name="planId" value={plan.id} /> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <input name="name" defaultValue={plan?.name} placeholder="Nombre" required className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
        <input name="slug" defaultValue={plan?.slug} placeholder="slug" required className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
        <input name="monthlyPrice" defaultValue={plan?.priceMonthly} type="number" placeholder="Precio mensual" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
        <input name="annualPrice" defaultValue={plan?.priceYearly} type="number" placeholder="Precio anual" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
        <input name="maxUsers" defaultValue={plan?.maxUsers} type="number" placeholder="Usuarios maximos" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
        <input name="maxBranches" defaultValue={plan?.maxBranches} type="number" placeholder="Sucursales maximas" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
        <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium">
          <input name="trialAllowed" type="checkbox" defaultChecked={plan?.trialAllowed ?? true} className="size-4 accent-primary" />
          Trial permitido
        </label>
        <select name="status" defaultValue={plan?.status ?? "ACTIVE"} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Feature gating</p>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {moduleKeys.map((module) => (
            <label key={module} className="flex items-center gap-2 rounded-lg bg-muted px-2 py-2 text-xs font-medium">
              <input name={`module:${module}`} type="checkbox" defaultChecked={plan?.features.includes(module) ?? false} className="size-4 accent-primary" />
              {module}
            </label>
          ))}
        </div>
      </div>
      <SubmitButton className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Guardar plan</SubmitButton>
    </form>
  );
}

export default async function AdminPlansPage() {
  const plans = await getDynamicPlans();

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Feature gating</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Planes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Planes editables con modulos listos para gating futuro.</p>
        </div>
        <ModalTrigger
          title="Crear plan"
          size="xl"
          trigger={(
            <span className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <Plus className="size-4" /> Crear plan
            </span>
          )}
        >
          <PlanForm />
        </ModalTrigger>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.slug} className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{plan.name}</p>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{plan.slug}</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-right">
                    <p className="text-2xl font-semibold">${plan.priceMonthly}</p>
                    <p className="text-xs text-muted-foreground">${plan.priceYearly}/año</p>
                  </div>
                  <details className="relative">
                    <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg border bg-background hover:bg-muted">
                      <MoreHorizontal className="size-4" />
                    </summary>
                    <div className="absolute right-0 top-9 z-30 w-44 rounded-lg border bg-card p-1.5 shadow-[0_18px_50px_hsl(220_20%_10%/0.18)]">
                      <ModalTrigger title={`Editar ${plan.name}`} size="xl" trigger={<span className="block cursor-pointer rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-muted">Editar</span>}>
                        <PlanForm plan={plan} />
                      </ModalTrigger>
                      <form action={togglePlanStatusAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <SubmitButton variant="ghost" className="block h-auto w-full rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-muted">{plan.status === "ACTIVE" ? "Desactivar" : "Activar"}</SubmitButton>
                      </form>
                      <form action={deletePlanAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <SubmitButton variant="ghost" className="block h-auto w-full rounded-lg px-2 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10">{(plan.businessCount ?? 0) > 0 ? "Desactivar (en uso)" : "Eliminar"}</SubmitButton>
                      </form>
                    </div>
                  </details>
                </div>
              </div>
              <div className="mt-3 flex gap-2 text-xs font-medium">
                <span className="rounded-lg bg-muted px-2 py-1">{plan.maxUsers} usuarios</span>
                <span className="rounded-lg bg-muted px-2 py-1">{plan.maxBranches} sucursales</span>
                <span className="rounded-lg bg-accent px-2 py-1 text-accent-foreground">{plan.status}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {plan.features.map((module) => (
                  <span key={module} className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium">
                    <CheckCircle2 className="size-3 text-primary" /> {module}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
