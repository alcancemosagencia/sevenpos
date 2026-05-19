import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { navigationItems } from "@/lib/navigation";
import { can } from "@/lib/rbac";
import { requireTenantContext } from "@/lib/tenant";

const groupLabels: Record<string, string> = {
  pos: "POS",
  operation: "Operacion",
  channels: "Canales",
  configuration: "Configuración",
  reports: "Reportes",
};

export default async function MorePage() {
  const tenant = await requireTenantContext();
  const secondaryItems = navigationItems.filter(
    (item) => !item.mobile && can(tenant.currentUser.role, item.permission),
  );
  const groups = Object.entries(
    secondaryItems.reduce<Record<string, typeof secondaryItems>>((acc, item) => {
      const key = item.group ?? "main";
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {}),
  );

  return (
    <>
      <PageHeader title="Más" description="Accesos secundarios optimizados para mobile." />
      <div className="space-y-4">
        {groups.map(([group, items]) => (
          <section key={group} className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {groupLabels[group] ?? "General"}
            </p>
            <div className="grid gap-2">
              {items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href}>
                    <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Icon className="size-4" />
                      </div>
                      <span className="flex-1 text-sm font-semibold">{item.label}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
