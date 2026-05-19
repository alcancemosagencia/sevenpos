"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { requireTenantContext } from "@/lib/tenant";

function readNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export async function updateTaxSettingsAction(formData: FormData) {
  const tenant = await requireTenantContext();

  if (!tenant.businessId || !can(tenant.currentUser.role, "settings:access")) {
    throw new Error("No tienes permiso para editar impuestos.");
  }

  await prisma.businessTaxSettings.upsert({
    where: { businessId: tenant.businessId },
    create: {
      businessId: tenant.businessId,
      taxesEnabled: formData.get("taxesEnabled") === "on",
      ivaRate: readNumber(formData, "ivaRate").toString(),
      customTaxName: String(formData.get("customTaxName") ?? "").trim() || null,
      customTaxRate: readNumber(formData, "customTaxRate").toString(),
      tipsEnabled: formData.get("tipsEnabled") === "on",
      tipRate: readNumber(formData, "tipRate").toString(),
      tipMode: String(formData.get("tipMode") ?? "MANUAL"),
    },
    update: {
      taxesEnabled: formData.get("taxesEnabled") === "on",
      ivaRate: readNumber(formData, "ivaRate").toString(),
      customTaxName: String(formData.get("customTaxName") ?? "").trim() || null,
      customTaxRate: readNumber(formData, "customTaxRate").toString(),
      tipsEnabled: formData.get("tipsEnabled") === "on",
      tipRate: readNumber(formData, "tipRate").toString(),
      tipMode: String(formData.get("tipMode") ?? "MANUAL"),
    },
  });

  revalidatePath("/settings/taxes");
  revalidatePath("/pos");
}
