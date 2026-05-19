import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTaxSettingsAction } from "@/features/taxes/actions";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export default async function TaxesSettingsPage() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) return null;

  const settings = await prisma.businessTaxSettings.findUnique({
    where: { businessId: tenant.businessId },
  });

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Operación</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Impuestos y propinas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configura IVA, impuestos personalizados y propinas por negocio.</p>
      </div>

      <form action={updateTaxSettingsAction} className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-medium text-slate-900">Impuestos</h2>
            <p className="mt-1 text-xs text-muted-foreground">Si está activo, el POS sumará impuestos al total final.</p>
          </div>
          <label className="flex items-center justify-between rounded-lg border bg-muted/25 px-3 py-2 text-sm font-medium">
            Activar impuestos
            <input name="taxesEnabled" type="checkbox" defaultChecked={settings?.taxesEnabled ?? false} className="size-4 accent-primary" />
          </label>
          <label className="space-y-1.5">
            <Label className="text-xs">IVA %</Label>
            <Input name="ivaRate" type="number" min="0" step="0.01" defaultValue={settings ? decimalToNumber(settings.ivaRate) : 0} className="h-10" />
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className="space-y-1.5">
              <Label className="text-xs">Nombre impuesto custom</Label>
              <Input name="customTaxName" defaultValue={settings?.customTaxName ?? ""} className="h-10" placeholder="Servicio, municipal..." />
            </label>
            <label className="space-y-1.5">
              <Label className="text-xs">%</Label>
              <Input name="customTaxRate" type="number" min="0" step="0.01" defaultValue={settings ? decimalToNumber(settings.customTaxRate) : 0} className="h-10" />
            </label>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-medium text-slate-900">Propinas</h2>
            <p className="mt-1 text-xs text-muted-foreground">Puede desactivarse completamente para minimarkets o retail.</p>
          </div>
          <label className="flex items-center justify-between rounded-lg border bg-muted/25 px-3 py-2 text-sm font-medium">
            Activar propinas
            <input name="tipsEnabled" type="checkbox" defaultChecked={settings?.tipsEnabled ?? false} className="size-4 accent-primary" />
          </label>
          <label className="space-y-1.5">
            <Label className="text-xs">Porcentaje sugerido %</Label>
            <Input name="tipRate" type="number" min="0" step="0.01" defaultValue={settings ? decimalToNumber(settings.tipRate) : 0} className="h-10" />
          </label>
          <label className="space-y-1.5">
            <Label className="text-xs">Modo</Label>
            <select name="tipMode" defaultValue={settings?.tipMode ?? "MANUAL"} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium">
              <option value="MANUAL">Manual</option>
              <option value="AUTO">Automático</option>
            </select>
          </label>
        </Card>

        <div className="lg:col-span-2">
          <Button className="h-10">Guardar configuración fiscal</Button>
        </div>
      </form>
    </section>
  );
}
