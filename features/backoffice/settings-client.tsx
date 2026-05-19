"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { UserProfile } from "@clerk/nextjs";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Landmark,
  Lock,
  Printer,
  Receipt,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppModal } from "@/components/shared/app-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPlanUpgradeAction, updateBusinessProfileAction, updateExchangeRateAction } from "@/features/backoffice/actions";
import { featureListHas } from "@/lib/feature-gating";

type SettingsPlan = {
  id: string | null;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxBranches: number;
  features: string[];
};

type UpgradePlan = {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxBranches: number;
  status: string;
  features: string[];
};

type SettingsBusiness = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  exchangeRate: number;
  logoUrl: string | null;
  subscriptionStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
  nextPaymentAt: string | null;
  lastPaymentAt: string | null;
  billingPaymentMethod: string | null;
  counts: { users: number; branches: number; products: number };
  plan: SettingsPlan;
};

function money(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function dateLabel(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function statusLabel(status: SettingsBusiness["subscriptionStatus"]) {
  const labels = {
    TRIAL: "Trial",
    ACTIVE: "Activa",
    PAST_DUE: "Vencida",
    SUSPENDED: "Suspendida",
    CANCELLED: "Cancelada",
  };
  return labels[status];
}

function featureLabel(feature: string) {
  return feature
    .replace("menÃº", "menú")
    .replace("mÃ³vil", "móvil")
    .replace("auditorÃ­a", "auditoría")
    .replace("campaÃ±as", "campañas");
}

export function SettingsClient({
  business,
  plans,
  features,
}: {
  business: SettingsBusiness;
  plans: UpgradePlan[];
  features: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [securityOpen, setSecurityOpen] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentPlanIndex = Math.max(0, plans.findIndex((plan) => plan.id === business.plan.id || plan.slug === business.plan.slug));
  const upgradePlans = plans
    .filter((plan) => plan.status === "ACTIVE")
    .filter((_, index) => index > currentPlanIndex)
    .slice(0, 2);

  const operationalModules = [
    { label: "POS", description: "Caja, cobro y operación diaria.", href: "/pos", feature: "POS", icon: Settings2 },
    { label: "Ticket e impresora", description: "Ticket 58/80mm, auto print y logo.", href: "/settings/ticket", feature: "tickets", icon: Receipt },
    { label: "Impuestos", description: "IVA y porcentajes operativos.", href: "/settings/taxes", feature: "ventas", icon: Landmark },
    { label: "Propinas", description: "Preparado para cobros con servicio.", href: null, feature: "ventas", icon: Sparkles },
    { label: "Delivery", description: "Métodos, fee y horarios del menú público.", href: "/public-menu/settings", feature: "delivery", icon: CalendarClock },
    { label: "Horarios", description: "Disponibilidad pública por canal.", href: "/public-menu/settings", feature: "menú público", icon: CalendarClock },
    { label: "Sucursales", description: "Límites y operación multi-sucursal.", href: "/dashboard/branches", feature: "multi-sucursal", icon: Building2 },
  ].filter((module) => featureListHas(features, module.feature));

  function submitUpgrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await requestPlanUpgradeAction(formData);
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Configuración</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">Ajustes del negocio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Perfil, plan, facturación, moneda y operación en un solo lugar.</p>
        </div>
        <Button asChild variant="outline" className="h-9">
          <Link href={`/${business.slug}`} target="_blank">
            <ExternalLink className="size-4" />
            Ver tienda
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-3.5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Información del negocio</h2>
              <p className="text-xs text-muted-foreground">Datos base usados por POS, menú público y tickets.</p>
            </div>
          </div>

          <form action={updateBusinessProfileAction} className="space-y-2.5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Nombre</Label>
                <Input name="name" defaultValue={business.name} className="h-9" />
              </label>
              <label className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input name="phone" defaultValue={business.phone ?? ""} className="h-9" />
              </label>
              <label className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input name="email" type="email" defaultValue={business.email ?? ""} className="h-9" />
              </label>
              <label className="space-y-1.5">
                <Label className="text-xs">Ciudad</Label>
                <Input name="city" defaultValue={business.city ?? ""} className="h-9" />
              </label>
              <label className="space-y-1.5">
                <Label className="text-xs">País</Label>
                <Input name="country" defaultValue={business.country ?? ""} className="h-9" />
              </label>
              <label className="space-y-1.5">
                <Label className="text-xs">Moneda base</Label>
                <select name="currency" defaultValue={business.currency} className="h-9 w-full rounded-lg border bg-background px-3 text-sm font-medium">
                  <option value="USD">USD</option>
                  <option value="BS">Bs</option>
                  <option value="CLP">CLP</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <Label className="text-xs">Timezone</Label>
                <Input value={timezone} readOnly className="h-9 bg-muted" />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Dirección</Label>
                <Input name="address" defaultValue={business.address ?? ""} className="h-9" />
              </label>
              <label className="space-y-1.5">
                <Label className="text-xs">Logo</Label>
                <Input value={business.logoUrl ?? "Configurable desde Menú público"} readOnly className="h-9 bg-muted" />
              </label>
              <label className="space-y-1.5">
                <Label className="text-xs">Slug público</Label>
                <Input name="slug" defaultValue={business.slug} className="h-9" />
              </label>
            </div>
            <Button className="h-9">Guardar información</Button>
          </form>
        </Card>

        <div className="space-y-3">
          <Card className="overflow-hidden">
            <div className="bg-slate-950 p-3.5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/55">Plan actual</p>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight">{business.plan.name}</h2>
                  <p className="mt-1 text-sm text-white/65">{money(business.plan.priceMonthly)} / mes</p>
                </div>
                <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-medium">{statusLabel(business.subscriptionStatus)}</span>
              </div>
            </div>
            <div className="space-y-2.5 p-3.5">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                  <p className="mt-1 font-semibold text-slate-900">{business.counts.users}/{business.plan.maxUsers || "∞"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Sucursales</p>
                  <p className="mt-1 font-semibold text-slate-900">{business.counts.branches}/{business.plan.maxBranches || "∞"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Productos</p>
                  <p className="mt-1 font-semibold text-slate-900">{business.counts.products}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {business.plan.features.slice(0, 12).map((feature) => (
                  <span key={feature} className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                    {featureLabel(feature)}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-3.5">
            <div className="mb-3 flex items-center gap-3">
              <CreditCard className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-slate-900">Facturación</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Método</span><span className="font-medium">{business.billingPaymentMethod ?? "Manual pendiente"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Próximo pago</span><span className="font-medium">{dateLabel(business.nextPaymentAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Última renovación</span><span className="font-medium">{dateLabel(business.lastPaymentAt)}</span></div>
            </div>
          </Card>
        </div>
      </div>

      {upgradePlans.length ? (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-slate-900">Actualizar plan</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {upgradePlans.map((plan) => {
              const unlocked = plan.features.filter((feature) => !featureListHas(business.plan.features, feature));
              return (
                <form key={plan.id} onSubmit={submitUpgrade} className="rounded-lg border bg-card p-4">
                  <input type="hidden" name="planId" value={plan.id} />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{plan.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{money(plan.priceMonthly)} / mes</p>
                    </div>
                    <BadgeCheck className="size-5 text-primary" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {unlocked.slice(0, 8).map((feature) => (
                      <span key={feature} className="rounded-lg bg-muted px-2 py-1 text-[11px] font-medium text-slate-700">{featureLabel(feature)}</span>
                    ))}
                  </div>
                  <Button disabled={pending} className="mt-4 h-10 w-full">{pending ? "Preparando..." : "Actualizar plan"}</Button>
                </form>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[0.78fr_1.22fr]">
        <Card className="p-3.5">
          <div className="mb-3 flex items-center gap-3">
            <Landmark className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-slate-900">Moneda y tasa</h2>
          </div>
          <form action={updateExchangeRateAction} className="space-y-3">
            <Label className="text-xs">1 USD =</Label>
            <div className="flex gap-2">
              <Input name="exchangeRate" type="number" min="0.01" step="0.01" defaultValue={business.exchangeRate} className="h-9" />
              <Button className="h-9">Guardar</Button>
            </div>
            <div className="rounded-lg bg-muted/45 p-2.5 text-sm">
              <span className="text-muted-foreground">Preview:</span> <span className="font-semibold">US$10 = Bs {(10 * business.exchangeRate).toFixed(2)}</span>
            </div>
          </form>
        </Card>

        <Card className="p-3.5">
          <div className="mb-3 flex items-center gap-3">
            <Printer className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-slate-900">Configuración operativa</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {operationalModules.map((module) => {
              const Icon = module.icon;
              const content = (
                <div className="flex items-start gap-2.5 rounded-lg border bg-muted/25 p-2.5 transition hover:bg-muted/45">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{module.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{module.description}</p>
                  </div>
                </div>
              );
              return module.href ? <Link key={module.label} href={module.href}>{content}</Link> : <div key={module.label}>{content}</div>;
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-3.5">
          <div className="mb-3 flex items-center gap-3">
            <Lock className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-slate-900">Seguridad</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Administra sesiones, dispositivos, contraseña y autenticación de dos factores sin salir de SevenPOS.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {["Sesiones", "Dispositivos", "Contraseña", "2FA"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSecurityOpen(true)}
                className="rounded-lg border bg-muted/20 px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-muted/40"
              >
                {item}
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Gestionar en Clerk</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-3.5">
          <div className="mb-3 flex items-center gap-3">
            <ShieldCheck className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-slate-900">Identificadores</h2>
          </div>
          <Label className="text-xs">ID del negocio</Label>
          <div className="mt-2 flex gap-2">
            <Input value={business.id} readOnly className="h-9 bg-muted font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" className="size-9" onClick={() => navigator.clipboard?.writeText(business.id)}>
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
            <CheckCircle2 className="size-4" />
            Tenant aislado por businessId y plan dinámico.
          </div>
        </Card>
      </div>

      <AppModal
        open={securityOpen}
        onClose={() => setSecurityOpen(false)}
        title="Seguridad de la cuenta"
        description="Sesiones, dispositivos, contraseña y 2FA gestionados con Clerk."
        size="lg"
      >
        <div className="max-h-[72vh] overflow-y-auto p-2">
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none border-0",
                navbar: "hidden",
                pageScrollBox: "p-0",
              },
            }}
          />
        </div>
      </AppModal>
    </section>
  );
}
