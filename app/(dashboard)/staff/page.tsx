import Link from "next/link";
import { Activity, Shield, UserRound, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function StaffPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const usersCount = await prisma.user.count({ where: { businessId: tenant.businessId } });
  const activeUsers = await prisma.user.count({ where: { businessId: tenant.businessId, isActive: true } });
  const rolesCount = await prisma.accessRole.count({ where: { businessId: tenant.businessId } });

  const cards = [
    {
      href: "/staff/users",
      title: "Usuarios",
      description: "Equipo, sucursal, estado y rol operativo.",
      icon: UserRound,
      metric: `${activeUsers}/${usersCount}`,
      label: "activos",
    },
    {
      href: "/staff/roles",
      title: "Roles",
      description: "Plantillas y permisos ACL por módulo.",
      icon: Shield,
      metric: rolesCount,
      label: "roles",
    },
    {
      href: "/staff/activity",
      title: "Actividad",
      description: "Auditoría preparada para cambios de personal.",
      icon: Activity,
      metric: "Próximo",
      label: "logs",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Configuración</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Personal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Centro operativo para usuarios, roles y actividad del equipo.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_hsl(222_28%_8%/0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{card.label}</span>
                </div>
                <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">{card.metric}</p>
                <h2 className="mt-2 text-sm font-semibold text-slate-900">{card.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-slate-900">Flujo recomendado</h2>
          </div>
        </div>
        <div className="grid gap-0 divide-y text-sm md:grid-cols-3 md:divide-x md:divide-y-0">
          {["Crea o edita roles con plantillas.", "Asigna usuarios a sucursales y roles.", "Revisa actividad cuando actives auditoría."].map((item, index) => (
            <div key={item} className="p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Paso {index + 1}</p>
              <p className="mt-2 font-medium text-slate-800">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
