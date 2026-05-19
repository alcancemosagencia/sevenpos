"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { saveAdminSettingsAction } from "@/features/admin/admin-config-actions";
import type { AdminSettings } from "@/features/admin/admin-store";

export function AdminSettingsForm({ settings }: { settings: AdminSettings }) {
  const [previewUrl, setPreviewUrl] = useState(settings.branding.logoUrl);
  const previewKey = useMemo(() => previewUrl ?? "fallback", [previewUrl]);

  return (
    <form action={saveAdminSettingsAction} className="grid gap-3 xl:grid-cols-2">
      <Card className="p-4 xl:col-span-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-xl font-semibold text-white shadow-[0_18px_46px_hsl(224_42%_8%/0.18)]">
            {previewUrl ? (
              <Image key={previewKey} src={previewUrl} alt="SevenPOS logo" fill className="object-contain p-2" sizes="80px" unoptimized />
            ) : (
              "S7"
            )}
          </div>
          <div className="grid flex-1 gap-3 md:grid-cols-[1fr_1fr_220px]">
            <label className="space-y-1">
              <span className="text-xs font-semibold">Nombre comercial</span>
              <input name="commercialName" defaultValue={settings.branding.commercialName} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold">Slogan</span>
              <input name="slogan" defaultValue={settings.branding.slogan} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold">Logo global</span>
              <span className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-xs font-medium text-muted-foreground">
                <UploadCloud className="size-4" />
                Subir imagen
                <input
                  name="logo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setPreviewUrl(URL.createObjectURL(file));
                  }}
                />
              </span>
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-base font-semibold">SMTP</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input name="smtpHost" defaultValue={settings.smtp.host} placeholder="Host" className="h-10 rounded-lg border bg-background px-3 text-sm" />
          <input name="smtpPort" defaultValue={settings.smtp.port} placeholder="Puerto" className="h-10 rounded-lg border bg-background px-3 text-sm" />
          <input name="smtpUsername" defaultValue={settings.smtp.username} placeholder="Usuario" className="h-10 rounded-lg border bg-background px-3 text-sm" />
          <input name="smtpPassword" defaultValue={settings.smtp.password} placeholder="Contraseña" type="password" className="h-10 rounded-lg border bg-background px-3 text-sm" />
          <input name="smtpSenderEmail" defaultValue={settings.smtp.senderEmail} placeholder="Email remitente" className="h-10 rounded-lg border bg-background px-3 text-sm" />
          <input name="smtpSenderName" defaultValue={settings.smtp.senderName} placeholder="Nombre remitente" className="h-10 rounded-lg border bg-background px-3 text-sm" />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-base font-semibold">Acceso y operaciones</h2>
        <div className="mt-3 grid gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold">SUPER_ADMIN_EMAILS</span>
            <textarea name="superAdminEmails" defaultValue={settings.superAdminEmails} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder="admin@sevenpos.com, ops@sevenpos.com" />
          </label>
          <div className="grid gap-2 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold">Trial default</span>
              <input name="trialDefaultDays" type="number" defaultValue={settings.trialDefaultDays} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold">Moneda default</span>
              <select name="defaultCurrency" defaultValue={settings.defaultCurrency} className="h-10 w-full rounded-lg border bg-background px-3 text-sm font-medium">
                <option value="USD">USD</option>
                <option value="BS">Bs</option>
                <option value="CLP">CLP</option>
              </select>
            </label>
            <label className="flex items-end gap-2 rounded-lg border bg-background p-3">
              <input name="maintenanceMode" type="checkbox" defaultChecked={settings.maintenanceMode} className="size-5 accent-primary" />
              <span className="text-sm font-semibold">Modo mantenimiento</span>
            </label>
          </div>
        </div>
      </Card>

      <div className="xl:col-span-2">
        <button className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_hsl(218_92%_35%/0.22)]">
          Guardar configuración
        </button>
      </div>
    </form>
  );
}
