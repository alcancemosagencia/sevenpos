"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { writeAuditLog } from "@/features/audit/log";
import { can } from "@/lib/rbac";

function value(formData: FormData, key: string) {
  const input = formData.get(key);
  return typeof input === "string" ? input.trim() : "";
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export async function updateHardwareSettingsAction(formData: FormData) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) throw new Error("Negocio no disponible.");
  if (!can(tenant.currentUser.role, "settings:access")) throw new Error("No tienes permiso para hardware.");
  if (!tenant.hasFeature("tickets")) throw new Error("Tu plan no incluye configuración de tickets.");

  const copies = Math.max(1, Math.min(4, Number(value(formData, "copies") || 1)));

  await prisma.businessHardwareSettings.upsert({
    where: { businessId: tenant.businessId },
    create: {
      businessId: tenant.businessId,
      ticketSize: value(formData, "ticketSize") === "80" ? "80" : "58",
      autoPrint: checked(formData, "autoPrint"),
      cashPrinterName: value(formData, "cashPrinterName") || null,
      kitchenPrinterName: value(formData, "kitchenPrinterName") || null,
      openDrawerOnCash: checked(formData, "openDrawerOnCash"),
      copies,
      ticketLogoUrl: value(formData, "ticketLogoUrl") || null,
      ticketFooter: value(formData, "ticketFooter") || "Gracias por su compra",
      scannerEnabled: checked(formData, "scannerEnabled"),
      customerDisplay: checked(formData, "customerDisplay"),
      kioskMode: checked(formData, "kioskMode"),
      advancedHardware: checked(formData, "advancedHardware"),
    },
    update: {
      ticketSize: value(formData, "ticketSize") === "80" ? "80" : "58",
      autoPrint: checked(formData, "autoPrint"),
      cashPrinterName: value(formData, "cashPrinterName") || null,
      kitchenPrinterName: value(formData, "kitchenPrinterName") || null,
      openDrawerOnCash: checked(formData, "openDrawerOnCash"),
      copies,
      ticketLogoUrl: value(formData, "ticketLogoUrl") || null,
      ticketFooter: value(formData, "ticketFooter") || "Gracias por su compra",
      scannerEnabled: checked(formData, "scannerEnabled"),
      customerDisplay: checked(formData, "customerDisplay"),
      kioskMode: checked(formData, "kioskMode"),
      advancedHardware: checked(formData, "advancedHardware"),
    },
  });

  await writeAuditLog({
    businessId: tenant.businessId,
    userId: tenant.currentUser.id,
    action: "HARDWARE_SETTINGS_UPDATED",
    module: "SETTINGS",
    metadata: {
      ticketSize: value(formData, "ticketSize") === "80" ? "80" : "58",
      autoPrint: checked(formData, "autoPrint"),
      openDrawerOnCash: checked(formData, "openDrawerOnCash"),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/settings/hardware");
  revalidatePath("/pos");
}

export async function updateKdsStatusAction(formData: FormData) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) throw new Error("Negocio no disponible.");
  if (!tenant.hasFeature("KDS")) throw new Error("Tu plan no incluye KDS.");
  const saleId = value(formData, "saleId");
  const status = value(formData, "status") as "PENDING" | "PREPARING" | "READY";

  await prisma.sale.update({
    where: { id: saleId, businessId: tenant.businessId },
    data: { kdsStatus: status },
  });

  revalidatePath("/kds");
}
