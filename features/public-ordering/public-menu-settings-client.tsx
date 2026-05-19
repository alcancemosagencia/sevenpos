"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, ExternalLink, Eye, ImageIcon, Settings2, Star, Truck } from "lucide-react";
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
  { value: "1", label: "Lun" },
  { value: "2", label: "Mar" },
  { value: "3", label: "Mie" },
  { value: "4", label: "Jue" },
  { value: "5", label: "Vie" },
  { value: "6", label: "Sab" },
  { value: "0", label: "Dom" },
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

const tabs = [
  { id: "preview", label: "Preview", icon: Eye },
  { id: "delivery", label: "Entrega", icon: Truck },
  { id: "schedule", label: "Horarios", icon: Clock },
  { id: "brand", label: "Marca", icon: ImageIcon },
] as const;

export function PublicMenuSettingsClient({
  business,
  settings,
}: {
  business: BusinessPreview | null;
  settings: Partial<PublicMenuSettings> | null;
}) {
  const safeBusiness = business ?? { name: "SevenPOS", slug: "" };
  const initial = { ...defaultSettings, ...(settings ?? {}) };
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("preview");
  const [draft, setDraft] = useState(initial);
  const activeDaysValue = draft.activeDays || defaultSettings.activeDays;
  const activeDays = useMemo(() => new Set(activeDaysValue.split(",").map((day) => day.trim()).filter(Boolean)), [activeDaysValue]);
  const openNow = isBusinessOpen(activeDaysValue, draft.openTime || defaultSettings.openTime, draft.closeTime || defaultSettings.closeTime);

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
    <section className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Canales</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Menú público</h1>
            <p className="mt-1 text-sm text-muted-foreground">Delivery, retiro, horarios y presencia publica del negocio.</p>
          </div>
          <Button asChild variant="outline" className="h-10">
            <Link href={`/${safeBusiness.slug}`} target="_blank">
              <ExternalLink className="size-4" />
              Abrir tienda
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="flex gap-2 overflow-x-auto border-b p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <form action={updatePublicOrderingSettingsAction} className="space-y-0 p-4">
            <input type="hidden" name="activeDays" value={activeDaysValue} />

            <div className={activeTab === "preview" ? "grid gap-3 sm:grid-cols-3" : "hidden"}>
              <InfoTile label="Estado" value={openNow ? "Abierto ahora" : "Cerrado"} />
              <InfoTile label="Entrega" value={draft.deliveryEnabled ? "Delivery activo" : "Delivery off"} />
              <InfoTile label="Ticket promedio" value="Listo para pedidos" />
            </div>

            <div className={activeTab === "delivery" ? "space-y-4" : "hidden"}>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { key: "deliveryEnabled", label: "Delivery" },
                  { key: "pickupEnabled", label: "Retiro" },
                  { key: "dineInEnabled", label: "Comer en local" },
                ].map((option) => (
                  <label key={option.key} className="flex h-11 items-center justify-between rounded-lg border bg-background px-3 text-sm font-semibold">
                    <span>{option.label}</span>
                    <input
                      name={option.key}
                      type="checkbox"
                      checked={Boolean(draft[option.key as keyof PublicMenuSettings])}
                      onChange={(event) => updateDraft(option.key as keyof PublicMenuSettings, event.target.checked as never)}
                      className="size-4 accent-primary"
                    />
                  </label>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Delivery fee" name="deliveryFee" type="number" value={draft.deliveryFee} onChange={(value) => updateDraft("deliveryFee", Number(value))} />
                <Field label="Impuesto %" name="taxRate" type="number" value={draft.taxRate} onChange={(value) => updateDraft("taxRate", Number(value))} />
                <Field label="Distancia" name="distanceLabel" value={draft.distanceLabel} onChange={(value) => updateDraft("distanceLabel", value)} />
                <Field label="Tiempo estimado" name="etaLabel" value={draft.etaLabel} onChange={(value) => updateDraft("etaLabel", value)} />
              </div>
            </div>

            <div className={activeTab === "schedule" ? "space-y-4" : "hidden"}>
              <input type="hidden" name="openTime" value={draft.openTime} />
              <input type="hidden" name="closeTime" value={draft.closeTime} />
              <div className="space-y-2">
                <Label className="text-xs">Horarios por dia</Label>
                <div className="grid gap-2">
                  {dayOptions.map((day) => (
                    <div key={day.value} className="grid grid-cols-[86px_1fr_1fr] items-center gap-2 rounded-lg border bg-background p-2 text-xs font-semibold">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={activeDays.has(day.value)} onChange={() => toggleDay(day.value)} className="size-4 accent-primary" />
                        {day.label}
                      </label>
                      <input
                        aria-label={`Apertura ${day.label}`}
                        type="time"
                        value={draft.openTime}
                        onChange={(event) => updateDraft("openTime", event.target.value)}
                        className="h-9 rounded-lg border bg-muted/35 px-2 font-medium"
                      />
                      <input
                        aria-label={`Cierre ${day.label}`}
                        type="time"
                        value={draft.closeTime}
                        onChange={(event) => updateDraft("closeTime", event.target.value)}
                        className="h-9 rounded-lg border bg-muted/35 px-2 font-medium"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">La estructura queda preparada para horarios independientes por dia; el guardado actual mantiene compatibilidad con el horario global existente.</p>
              </div>
            </div>

            <div className={activeTab === "brand" ? "space-y-4" : "hidden"}>
              <section className="rounded-lg border bg-muted/20 p-3 shadow-[0_12px_36px_hsl(224_36%_14%/0.04)]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Portada del menu</p>
                    <p className="text-xs text-muted-foreground">Imagen horizontal para el hero publico.</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">Preview instantaneo</span>
                </div>
                <ImageUploader
                  name="coverImageUrl"
                  label="Imagen portada"
                  kind="cover"
                  value={draft.coverImageUrl ?? ""}
                  onChange={(value) => updateDraft("coverImageUrl", value)}
                  variant="compact"
                  previewClassName="min-h-28"
                />
              </section>

              <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
                <section className="rounded-lg border bg-background p-3 shadow-[0_12px_36px_hsl(224_36%_14%/0.04)]">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-slate-900">Logo publico</p>
                    <p className="text-xs text-muted-foreground">Marca compacta visible en la tienda.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ImageUploader
                      name="logoUrl"
                      label="Logo"
                      kind="logo"
                      value={draft.logoUrl ?? ""}
                      onChange={(value) => updateDraft("logoUrl", value)}
                      variant="avatar"
                    />
                    <div className="min-w-0 flex-1 pt-6">
                      <p className="truncate text-sm font-medium text-slate-800">{safeBusiness.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">PNG, JPG o WEBP. Ideal cuadrado.</p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 rounded-lg border bg-background p-3 shadow-[0_12px_36px_hsl(224_36%_14%/0.04)] sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-slate-900">Reputacion y legales</p>
                    <p className="text-xs text-muted-foreground">Datos visibles en el hero y antes de confirmar pedidos.</p>
                  </div>
                  <Field label="Rating" name="rating" type="number" value={draft.rating} onChange={(value) => updateDraft("rating", Number(value))} />
                  <Field label="Terminos URL" name="termsUrl" value={draft.termsUrl ?? ""} onChange={(value) => updateDraft("termsUrl", value)} />
                </section>
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t pt-4">
              <Button className="h-10">Guardar Menú público</Button>
            </div>
          </form>
        </Card>
      </div>

      <Card className="h-fit overflow-hidden lg:sticky lg:top-4">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-primary" />
            <p className="text-sm font-semibold">Preview realtime</p>
          </div>
        </div>
        <div className="bg-muted/40 p-4">
          <div className="overflow-hidden rounded-lg border bg-background shadow-[0_22px_70px_hsl(224_36%_14%/0.12)]">
            <div className="relative h-40 bg-slate-950">
              <Image
                src={draft.coverImageUrl || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&h=500&fit=crop"}
                alt={safeBusiness.name}
                fill
                unoptimized
                className="object-cover opacity-60"
                sizes="380px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${openNow ? "bg-white text-slate-900" : "bg-red-500 text-white"}`}>
                    {openNow ? "Abierto" : "Cerrado"}
                  </span>
                  <span className="rounded-lg bg-white/15 px-2 py-1 text-[11px] font-medium backdrop-blur">{draft.deliveryEnabled ? "Delivery" : "Retiro"}</span>
                </div>
                <h2 className="truncate text-xl font-semibold">{safeBusiness.name}</h2>
                <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-white/85">
                  <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" />{Number(draft.rating).toFixed(1)}</span>
                  <span>{draft.distanceLabel}</span>
                  <span>{draft.etaLabel}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {["Producto destacado", "Combo recomendado"].map((name, index) => (
                <div key={name} className="flex gap-3 rounded-lg border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">Descripción breve, precio visible y boton rapido.</p>
                    <p className="mt-2 text-sm font-semibold text-primary">US${index === 0 ? "4.50" : "7.20"}</p>
                  </div>
                  <div className="flex size-20 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ImageIcon className="size-6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/35 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
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
      <Label className="text-xs">{label}</Label>
      <Input name={name} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10" />
    </div>
  );
}
