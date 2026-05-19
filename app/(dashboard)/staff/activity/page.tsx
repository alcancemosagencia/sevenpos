import { Activity, Clock, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireTenantContext } from "@/lib/tenant";

export default async function StaffActivityPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Personal</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Actividad</h1>
        <p className="mt-1 text-sm text-muted-foreground">Auditoría de equipo preparada para logs, cambios de roles e inicios de sesión.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Cambios de roles", value: "Preparado", icon: ShieldCheck },
          { label: "Login users", value: "Próximo", icon: Activity },
          { label: "Auditoría", value: "Historial", icon: Clock },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-xl font-semibold tracking-tight text-slate-900">{item.value}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-8 text-center">
        <Activity className="mx-auto size-10 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold text-slate-900">Actividad del equipo lista para conectar</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Esta vista queda preparada para mostrar auditoría real: cambios de permisos, altas de usuarios, suspensiones e inicios de sesión.
        </p>
      </Card>
    </section>
  );
}
