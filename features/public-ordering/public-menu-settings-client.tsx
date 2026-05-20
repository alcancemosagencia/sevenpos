"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Banknote,
  Clock,
  CreditCard,
  ExternalLink,
  Globe2,
  ImageIcon,
  MapPinned,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/shared/image-uploader";
import { updatePublicOrderingSettingsAction } from "@/features/backoffice/actions";
import { isBusinessOpen } from "@/features/public-ordering/format";

type PublicMenuSettings = {
  coverImageUrl: string | null;
  logoUrl: string | null;
  rating: number;
  distanceLabel: string;
  etaLabel: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
  openTime: string;
  closeTime: string;
  activeDays: string;
  deliveryFee: number;
  taxRate: number;
  termsUrl: string | null;
};

type BusinessPreview = {
  name: string;
  slug: string;
};

const dayOptions = [
  { value: "1", label: "Lun", name: "Lunes" },
  { value: "2", label: "Mar", name: "Martes" },
  { value: "3", label: "Mie", name: "Miércoles" },
  { value: "4", label: "Jue", name: "Jueves" },
  { value: "5", label: "Vie", name: "Viernes" },
  { value: "6", label: "Sab", name: "Sábado" },
  { value: "0", label: "Dom", name: "Domingo" },
];

const defaultSettings: PublicMenuSettings = {
  coverImageUrl: null,
  logoUrl: null,
  rating: 4.8,
  distanceLabel: "0.8 km",
  etaLabel: "25-35 min",
  deliveryEnabled: true,
  pickupEnabled: true,
  dineInEnabled: false,
  openTime: "09:00",
  closeTime: "21:00",
  activeDays: "1,2,3,4,5,6",
  deliveryFee: 0,
  taxRate: 0,
  termsUrl: null,
};

const sections = [
  { id: "brand", label: "Marca", icon: ImageIcon },
  { id: "schedule", label: "Horarios", icon: Clock },
  { id: "delivery", label: "Entregas", icon: Truck },
  { id: "pickup", label: "Retiros", icon: Store },
  { id: "payments", label: "Pagos", icon: CreditCard },
  { id: "seo", label: "SEO y Redes", icon: Globe2 },
  { id: "preview", label: "Vista previa", icon: ShoppingBag },
] as const;

const paymentMethods = [
  { label: "Efectivo", icon: Banknote, enabled: true },
  { label: "Pago móvil", icon: CreditCard, enabled: true },
  { label: "Transferencia", icon: Banknote, enabled: true },
  { label: "Zelle", icon: CreditCard, enabled: false },
  { label: "Binance", icon: CreditCard, enabled: false },
  { label: "Mercado Pago", icon: CreditCard, enabled: false },
  { label: "Tarjetas", icon: CreditCard, enabled: false },
];

export function PublicMenuSettingsClient({
  business,
  settings,
}: {
  business: BusinessPreview | null;
  settings: Partial<PublicMenuSettings> | null;
}) {
  const safeBusiness = business ?? { name: "SevenPOS", slug: "" };
  const initial = { ...defaultSettings, ...(settings ?? {}) };
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["id"]>("brand");
  const [draft, setDraft] = useState(initial);
  const activeDaysValue = draft.activeDays || defaultSettings.activeDays;
  const activeDays = useMemo(() => new Set(activeDaysValue.split(",").map((day) => day.trim()).filter(Boolean)), [activeDaysValue]);
  const openNow = isBusinessOpen(activeDaysValue, draft.openTime || defaultSettings.openTime, draft.closeTime || defaultSettings.closeTime);
  const closingSoon = openNow && draft.etaLabel.toLowerCase().includes("min");

  function updateDraft<Key extends keyof PublicMenuSettings>(key: Key, value: PublicMenuSettings[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(value: string) {
    const next = new Set(activeDays);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    updateDraft("activeDays", Array.from(next).sort().join(","));
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Canales</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Tienda Online</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Configura tu storefront mobile-first para delivery, retiro, pagos y pedidos web.
          </p>
        </div>
        <Button asChild variant="outline" className="h-9 rounded-lg">
          <Link href={`/${safeBusiness.slug}`} target="_blank">
            <ExternalLink className="size-4" />
            Abrir tienda
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_360px]">
        <aside className="h-fit rounded-lg border bg-white p-2 shadow-[0_14px_40px_hsl(224_36%_14%/0.05)]">
          <div className="mb-2 rounded-lg bg-slate-950 p-3 text-white">
            <p className="text-sm font-semibold">Canal público</p>
            <p className="mt-1 text-xs text-white/60">Ecommerce y delivery</p>
          </div>
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const selected = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-medium transition ${
                    selected ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_18px_52px_hsl(224_36%_14%/0.06)]">
          <form action={updatePublicOrderingSettingsAction} className="space-y-0">
            <input type="hidden" name="activeDays" value={activeDaysValue} />
            <input type="hidden" name="openTime" value={draft.openTime} />
            <input type="hidden" name="closeTime" value={draft.closeTime} />
            {draft.deliveryEnabled ? <input type="hidden" name="deliveryEnabled" value="on" /> : null}
            {draft.pickupEnabled ? <input type="hidden" name="pickupEnabled" value="on" /> : null}
            {draft.dineInEnabled ? <input type="hidden" name="dineInEnabled" value="on" /> : null}

            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{sections.find((item) => item.id === activeSection)?.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">Cambios compatibles con la tienda pública actual.</p>
            </div>

            <div className="p-4">
              {activeSection === "brand" ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <section className="rounded-lg border bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Portada</p>
                        <p className="text-xs text-slate-500">Imagen horizontal para el hero de la tienda.</p>
                      </div>
                      <span className="inline-flex h-7 items-center justify-center rounded-full bg-slate-950 px-2.5 text-[11px] font-medium text-white">
                        Preview instantáneo
                      </span>
                    </div>
                    <ImageUploader
                      name="coverImageUrl"
                      label="Imagen portada"
                      kind="cover"
                      value={draft.coverImageUrl ?? ""}
                      onChange={(value) => updateDraft("coverImageUrl", value)}
                      variant="compact"
                      previewClassName="min-h-24"
                    />
                  </section>

                  <section className="rounded-lg border bg-white p-4">
                    <p className="text-sm font-medium text-slate-900">Logo y reputación</p>
                    <p className="mb-3 mt-1 text-xs text-slate-500">Marca, rating y confianza.</p>
                    <div className="flex gap-3">
                      <ImageUploader
                        name="logoUrl"
                        label="Logo"
                        kind="logo"
                        value={draft.logoUrl ?? ""}
                        onChange={(value) => updateDraft("logoUrl", value)}
                        variant="avatar"
                      />
                      <div className="min-w-0 flex-1 space-y-3 pt-5">
                        <Field label="Rating" name="rating" type="number" value={draft.rating} onChange={(value) => updateDraft("rating", Number(value))} />
                      </div>
                    </div>
                  </section>

                  <section className="grid gap-3 rounded-lg border bg-white p-4 xl:col-span-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="text-sm font-medium text-slate-900">Redes sociales y términos</p>
                      <p className="text-xs text-slate-500">Estructura preparada para Instagram, WhatsApp y políticas públicas.</p>
                    </div>
                    <Field label="Términos legales URL" name="termsUrl" value={draft.termsUrl ?? ""} onChange={(value) => updateDraft("termsUrl", value)} />
                    <ReadOnlyTile title="Redes sociales" text="Instagram, TikTok y WhatsApp preparados para persistencia futura." />
                  </section>
                </div>
              ) : null}

              {activeSection === "schedule" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatusTile label="Estado actual" value={openNow ? (closingSoon ? "Cerrando pronto" : "Abierto") : "Cerrado"} active={openNow} />
                    <Field label="Apertura global" name="openTimeVisible" type="time" value={draft.openTime} onChange={(value) => updateDraft("openTime", value)} />
                    <Field label="Cierre global" name="closeTimeVisible" type="time" value={draft.closeTime} onChange={(value) => updateDraft("closeTime", value)} />
                  </div>
                  <div className="grid gap-2">
                    {dayOptions.map((day) => (
                      <div key={day.value} className="grid gap-2 rounded-lg border bg-slate-50/70 p-2 text-xs sm:grid-cols-[130px_1fr_1fr_120px] sm:items-center">
                        <label className="flex items-center gap-2 font-medium text-slate-800">
                          <input type="checkbox" checked={activeDays.has(day.value)} onChange={() => toggleDay(day.value)} className="size-4 accent-slate-950" />
                          {day.name}
                        </label>
                        <input type="time" value={draft.openTime} onChange={(event) => updateDraft("openTime", event.target.value)} className="h-9 rounded-lg border bg-white px-2 font-medium" />
                        <input type="time" value={draft.closeTime} onChange={(event) => updateDraft("closeTime", event.target.value)} className="h-9 rounded-lg border bg-white px-2 font-medium" />
                        <span className={`rounded-full px-2 py-1 text-center text-[11px] font-medium ${activeDays.has(day.value) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {activeDays.has(day.value) ? "Abierto" : "Cerrado"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeSection === "delivery" ? (
                <div className="space-y-4">
                  <ToggleCard title="Delivery activo" description="Permite pedidos a domicilio en checkout." checked={draft.deliveryEnabled} onChange={(value) => updateDraft("deliveryEnabled", value)} icon={Truck} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Fee base" name="deliveryFee" type="number" value={draft.deliveryFee} onChange={(value) => updateDraft("deliveryFee", Number(value))} />
                    <Field label="Tiempo estimado" name="etaLabel" value={draft.etaLabel} onChange={(value) => updateDraft("etaLabel", value)} />
                    <ReadOnlyTile title="Km incluidos" text="Preparado para costo por radio y zona." />
                    <ReadOnlyTile title="Pedido mínimo" text="Preparado para regla comercial por zona." />
                  </div>
                  <div className="overflow-hidden rounded-lg border bg-slate-950 p-4 text-white">
                    <div className="flex items-center gap-2">
                      <MapPinned className="size-4" />
                      <p className="text-sm font-semibold">Mapa y zonas de entrega</p>
                    </div>
                    <p className="mt-2 text-xs text-white/60">Para activar mapa real necesitas configurar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` con Maps JavaScript API, Places API y Geocoding API.</p>
                    <div className="mt-4 h-28 rounded-lg bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.18),transparent_28%),linear-gradient(135deg,#111827,#020617)] ring-1 ring-white/10" />
                  </div>
                </div>
              ) : null}

              {activeSection === "pickup" ? (
                <div className="space-y-4">
                  <ToggleCard title="Retiro en tienda" description="Permite que el cliente compre y retire en el local." checked={draft.pickupEnabled} onChange={(value) => updateDraft("pickupEnabled", value)} icon={Store} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReadOnlyTile title="Preparación mínima" text="15-25 minutos, preparado para persistencia futura." />
                    <ReadOnlyTile title="Mensaje personalizado" text="Ej: Te avisaremos cuando esté listo." />
                  </div>
                </div>
              ) : null}

              {activeSection === "payments" ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Configuración visual preparada para métodos por negocio. El checkout actual conserva compatibilidad por país.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <div key={method.label} className="flex items-center justify-between rounded-lg border bg-white p-3">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800"><Icon className="size-4" /></span>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{method.label}</p>
                              <p className="text-xs text-slate-500">Instrucciones, alias y QR opcional.</p>
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${method.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {method.enabled ? "Activo" : "Listo"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activeSection === "seo" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReadOnlyTile title="SEO" text={`/${safeBusiness.slug} listo para indexación futura.`} />
                  <ReadOnlyTile title="Redes" text="Open Graph, WhatsApp preview e Instagram preparados." />
                  <ReadOnlyTile title="Soporte" text="Acceso rápido a WhatsApp del negocio en tienda pública." />
                  <ReadOnlyTile title="Tracking" text="Pedidos, perfil e historial cliente preparados en storefront." />
                </div>
              ) : null}

              {activeSection === "preview" ? (
                <StorefrontPreview businessName={safeBusiness.name} draft={draft} openNow={openNow} />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">La lógica actual de pedidos se mantiene intacta.</p>
              <Button className="h-9 rounded-lg bg-slate-950 px-4 text-white hover:bg-slate-800">Guardar Tienda Online</Button>
            </div>
          </form>
        </Card>

        <StorefrontPreview businessName={safeBusiness.name} draft={draft} openNow={openNow} compact />
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  name: string;
  value: string | number;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      <Input name={name} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-lg bg-white text-sm" />
    </div>
  );
}

function ReadOnlyTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border bg-slate-50/80 p-3">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}

function StatusTile({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${active ? "text-emerald-700" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: typeof Truck;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-lg border bg-white p-3 text-left transition hover:bg-slate-50">
      <span className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white"><Icon className="size-4" /></span>
        <span>
          <span className="block text-sm font-medium text-slate-900">{title}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
        </span>
      </span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-slate-950" : "bg-slate-200"}`}>
        <span className={`absolute top-1 size-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function StorefrontPreview({
  businessName,
  draft,
  openNow,
  compact = false,
}: {
  businessName: string;
  draft: PublicMenuSettings;
  openNow: boolean;
  compact?: boolean;
}) {
  return (
    <Card className={`${compact ? "hidden lg:block" : ""} h-fit overflow-hidden border-slate-200 bg-slate-950 p-3 shadow-[0_22px_70px_hsl(224_36%_14%/0.16)]`}>
      <div className="mx-auto max-w-[310px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0b0f14] p-2 text-white shadow-2xl">
        <div className="overflow-hidden rounded-[1.25rem] bg-[#111318]">
          <div className="relative h-36">
            <Image
              src={draft.coverImageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&h=500&fit=crop"}
              alt={businessName}
              fill
              unoptimized
              className="object-cover opacity-70"
              sizes="310px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-black/20" />
            <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium backdrop-blur">
              {openNow ? "Abierto" : "Cerrado"}
            </div>
          </div>
          <div className="space-y-3 p-3">
            <div className="flex items-center gap-3">
              <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-white text-sm font-semibold text-slate-950">
                {draft.logoUrl ? <Image src={draft.logoUrl} alt={businessName} fill unoptimized className="object-contain p-1.5" sizes="48px" /> : "S7"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{businessName}</p>
                <p className="text-[11px] text-white/55">🛒 Minimarket online · {draft.etaLabel}</p>
              </div>
            </div>
            <div className="flex gap-2 text-[11px]">
              <span className="rounded-full bg-white px-2 py-1 text-slate-950">⭐ {Number(draft.rating).toFixed(1)}</span>
              <span className="rounded-full bg-white/10 px-2 py-1">{draft.distanceLabel}</span>
              {draft.deliveryEnabled ? <span className="rounded-full bg-white/10 px-2 py-1">Delivery</span> : null}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
              <div className="h-9 rounded-full bg-white/10 pl-9 pt-2 text-xs text-white/45">Buscar productos...</div>
            </div>
            {["Bebidas frias", "Snacks y despensa"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white p-2 text-slate-950">
                <div className="flex size-14 items-center justify-center rounded-xl bg-slate-100 text-2xl">{index === 0 ? "🥤" : "🍪"}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{item}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Listo para pedir</p>
                </div>
                <div className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-semibold text-white">+</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/60">
        <ShieldCheck className="size-3.5" />
        Vista mobile ecommerce
      </div>
    </Card>
  );
}
