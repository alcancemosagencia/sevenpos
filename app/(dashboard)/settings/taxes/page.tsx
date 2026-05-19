import { Card } from "@/components/ui/card";

const taxRows = [
  { name: "IVA", rate: "0%", status: "Preparado" },
  { name: "Impuesto custom", rate: "0%", status: "Inactivo" },
];

export default function TaxesSettingsPage() {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Operacion</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Impuestos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Base preparada para IVA, impuestos custom y activacion por negocio.</p>
      </div>
      <Card className="overflow-hidden">
        {taxRows.map((tax) => (
          <div key={tax.name} className="flex items-center justify-between gap-3 border-b p-3 last:border-b-0">
            <div>
              <p className="text-sm font-semibold text-slate-900">{tax.name}</p>
              <p className="text-xs text-muted-foreground">Porcentaje editable en la siguiente fase fiscal.</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{tax.rate}</p>
              <p className="text-xs text-muted-foreground">{tax.status}</p>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}
