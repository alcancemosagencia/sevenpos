import { MoreHorizontal, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ModalTrigger } from "@/components/shared/modal-trigger";
import { deleteCurrencyAction, saveCurrencyAction, toggleCurrencyAction } from "@/features/admin/admin-config-actions";
import { getAdminCurrencies, type AdminCurrency } from "@/features/admin/admin-store";
import { bcvSchedulerConfig } from "@/lib/bcv";

function CurrencyForm({ currency }: { currency?: AdminCurrency }) {
  return (
    <form action={saveCurrencyAction} className="grid gap-3 p-4 sm:grid-cols-2">
      <input name="code" defaultValue={currency?.code} placeholder="USD" required className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
      <input name="name" defaultValue={currency?.name} placeholder="Nombre" required className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
      <input name="symbol" defaultValue={currency?.symbol} placeholder="$" required className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
      <input name="rate" defaultValue={currency?.rate ?? 1} type="number" step="0.0001" required className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
      <input name="rounding" defaultValue={currency?.rounding ?? "0.01"} placeholder="0.01" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
      <input name="country" defaultValue={currency?.country ?? ""} placeholder="País" className="h-10 rounded-lg border bg-background px-3 text-sm font-medium" />
      <select name="autoProvider" defaultValue={currency?.autoProvider ?? "MANUAL"} className="h-10 rounded-lg border bg-background px-3 text-sm font-medium">
        <option value="MANUAL">Manual</option>
        <option value="BCV">BCV Venezuela</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium">
          <input name="active" type="checkbox" defaultChecked={currency?.active ?? true} className="size-4 accent-primary" />
          Activa
        </label>
        <label className="flex items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium">
          <input name="default" type="checkbox" defaultChecked={currency?.default ?? false} className="size-4 accent-primary" />
          Default
        </label>
      </div>
      <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground sm:col-span-2">Guardar moneda</button>
    </form>
  );
}

export default async function AdminCurrenciesPage() {
  const currencies = await getAdminCurrencies();

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Multi-moneda global</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Monedas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tasas manuales, defaults y arquitectura preparada para BCV automatico.</p>
        </div>
        <ModalTrigger
          title="Crear moneda"
          size="lg"
          trigger={<span className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> Nueva</span>}
        >
          <CurrencyForm />
        </ModalTrigger>
      </div>

      <Card className="p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">BCV automatico</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurar <span className="font-semibold text-slate-700">{bcvSchedulerConfig.envUrl}</span> y un cron futuro con <span className="font-semibold text-slate-700">{bcvSchedulerConfig.envSecret}</span>. Si falla, se mantiene la tasa manual.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[0.7fr_1.4fr_0.7fr_0.8fr_0.8fr_0.8fr_0.45fr] gap-3 border-b bg-muted/45 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span>Código</span><span>Nombre</span><span>Simbolo</span><span>Tasa</span><span>Default</span><span>Estado</span><span></span>
        </div>
        {currencies.map((currency) => (
          <div key={currency.code} className="grid grid-cols-[0.7fr_1.4fr_0.7fr_0.8fr_0.8fr_0.8fr_0.45fr] items-center gap-3 border-b px-3 py-3 text-sm last:border-b-0">
            <p className="font-semibold text-slate-900">{currency.code}</p>
            <div>
              <p className="font-medium text-slate-800">{currency.name}</p>
              <p className="text-xs text-muted-foreground">{currency.country ?? "Global"} Â· {currency.autoProvider ?? "MANUAL"}</p>
            </div>
            <p className="font-medium">{currency.symbol}</p>
            <p className="font-medium">{currency.rate}</p>
            <span className={currency.default ? "font-semibold text-primary" : "text-muted-foreground"}>{currency.default ? "Si" : "No"}</span>
            <span className={`w-fit rounded-lg px-2 py-1 text-xs font-semibold ${currency.active ? "bg-blue-50 text-blue-700" : "bg-zinc-100 text-zinc-600"}`}>{currency.active ? "Activa" : "Inactiva"}</span>
            <details className="relative">
              <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg border bg-background hover:bg-muted"><MoreHorizontal className="size-4" /></summary>
              <div className="absolute right-0 top-9 z-30 w-44 rounded-lg border bg-card p-1.5 shadow-[0_18px_50px_hsl(220_20%_10%/0.18)]">
                <ModalTrigger title={`Editar ${currency.code}`} size="lg" trigger={<span className="block cursor-pointer rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-muted">Editar</span>}><CurrencyForm currency={currency} /></ModalTrigger>
                <form action={toggleCurrencyAction}><input type="hidden" name="code" value={currency.code} /><button className="block w-full rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-muted">{currency.active ? "Desactivar" : "Activar"}</button></form>
                <form action={deleteCurrencyAction}><input type="hidden" name="code" value={currency.code} /><button disabled={currency.default} className="block w-full rounded-lg px-2 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40">Eliminar</button></form>
              </div>
            </details>
          </div>
        ))}
      </Card>
    </section>
  );
}
