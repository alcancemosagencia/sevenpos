"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Check, ChefHat, MapPin, Rocket, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBusinessAction, type OnboardingState } from "@/app/(onboarding)/onboarding/actions";
import type { BusinessType } from "@/lib/business-features";

const initialState: OnboardingState = {};

function detectLocaleDefaults() {
  const locale = typeof navigator !== "undefined" ? navigator.language : "es-CL";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isVenezuela = locale.toLowerCase().includes("ve") || timezone.includes("Caracas");
  const isChile = locale.toLowerCase().includes("cl") || timezone.includes("Santiago");

  if (isVenezuela) return { country: "Venezuela", currency: "USD", phonePrefix: "+58", exchangeRate: "1" };
  if (isChile) return { country: "Chile", currency: "CLP", phonePrefix: "+56", exchangeRate: "1" };
  return { country: "", currency: "USD", phonePrefix: "", exchangeRate: "1" };
}

export function OnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction, pending] = useActionState(createBusinessAction, initialState);
  const [businessType, setBusinessType] = useState<BusinessType>("COMMERCE");
  const [defaults, setDefaults] = useState({ country: "", currency: "USD", phonePrefix: "", exchangeRate: "1" });
  const steps = useMemo(
    () => ["Rubro", "Datos", "Moneda", "Categoría", "Producto", "Caja", "Equipo"],
    [],
  );

  useEffect(() => {
    setDefaults(detectLocaleDefaults());
  }, []);

  return (
    <Card className="overflow-hidden border-white/70 bg-white/88 shadow-[0_24px_80px_hsl(218_40%_30%/0.12)] backdrop-blur-xl">
      <form action={formAction} className="space-y-5 p-4 sm:p-5">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {steps.map((step, index) => (
            <span key={step} className="shrink-0 rounded-lg bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground">
              {index + 1}. {step}
            </span>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setBusinessType("RESTAURANT")}
            className={`rounded-lg border p-3 text-left transition active:scale-[0.99] ${businessType === "RESTAURANT" ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:border-primary/40"}`}
          >
            <ChefHat className="mb-3 size-5" />
            <p className="font-semibold">Restaurante</p>
            <p className="mt-1 text-xs text-muted-foreground">Ventas de comida, delivery y mesas.</p>
            <p className="mt-2 text-[11px] font-medium text-primary">Tienda Online · KDS · Mesas próximamente</p>
          </button>
          <button
            type="button"
            onClick={() => setBusinessType("COMMERCE")}
            className={`rounded-lg border p-3 text-left transition active:scale-[0.99] ${businessType === "COMMERCE" ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:border-primary/40"}`}
          >
            <Store className="mb-3 size-5" />
            <p className="font-semibold">Comercio</p>
            <p className="mt-1 text-xs text-muted-foreground">Minimarket, retail, bodegas y licorerías.</p>
            <p className="mt-2 text-[11px] font-medium text-primary">POS · Preventa · Sitio web</p>
          </button>
        </div>
        <input type="hidden" name="businessType" value={businessType} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombres</Label>
            <Input id="firstName" name="firstName" autoComplete="given-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellidos</Label>
            <Input id="lastName" name="lastName" autoComplete="family-name" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nombre del negocio</Label>
          <Input id="name" name="name" required placeholder="Ej: Bodega El Sol" autoComplete="organization" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Celular</Label>
            <Input id="phone" name="phone" defaultValue={defaults.phonePrefix} placeholder="+56 9..." autoComplete="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={defaultEmail} autoComplete="email" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" placeholder="Calle, local o referencia" autoComplete="street-address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" name="city" autoComplete="address-level2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input id="country" name="country" defaultValue={defaults.country} autoComplete="country-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Moneda</Label>
            <select
              id="currency"
              name="currency"
              defaultValue={defaults.currency}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="USD">USD</option>
              <option value="CLP">CLP</option>
              <option value="VES">VES</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border bg-muted/35 p-3 sm:grid-cols-[1fr_140px]">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Configuración automática</p>
              <p className="text-xs text-muted-foreground">Chile activa CLP/RUT/IVA. Venezuela activa USD base, Bs y pago móvil.</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="exchangeRate" className="text-xs">Tasa inicial</Label>
            <Input id="exchangeRate" name="exchangeRate" type="number" step="0.0001" min="0.0001" defaultValue={defaults.exchangeRate} required />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ["Logo", "Sube tu marca luego en Ajustes"],
            ["Primera categoría", "Bebidas o alimentos"],
            ["Primer producto", "Listo para vender"],
            ["Abrir caja", "Monto inicial"],
            ["Invitar usuarios", "Opcional"],
            ["Hardware", "Impresora y scanner"],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border bg-card p-3">
              <Check className="mb-2 size-4 text-primary" />
              <p className="text-xs font-semibold">{title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        {state.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
            {state.error}
          </div>
        ) : null}

        <Button type="submit" disabled={pending} className="h-12 w-full">
          {pending ? "Creando negocio..." : "Completar setup"}
          {pending ? <Building2 className="size-4" /> : <ArrowRight className="size-4" />}
        </Button>
      </form>
      <div className="border-t bg-muted/35 px-5 py-3 text-xs text-muted-foreground">
        <Rocket className="mr-1 inline size-3.5 text-primary" />
        Al finalizar podrás ir al POS, dashboard o configurar hardware.
      </div>
    </Card>
  );
}
