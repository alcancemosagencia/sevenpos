"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { can } from "@/lib/rbac";

function value(formData: FormData, key: string) {
  const input = formData.get(key);
  return typeof input === "string" ? input.trim() : "";
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function createBranchAction(formData: FormData) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId || !can(tenant.currentUser.role, "settings:access")) {
    throw new Error("No tienes permiso para crear sucursales.");
  }
  if (!tenant.hasFeature("multi-sucursal")) {
    throw new Error("Tu plan no incluye multi-sucursal.");
  }

  const name = value(formData, "name");
  if (!name) throw new Error("Nombre requerido.");

  await prisma.branch.create({
    data: {
      businessId: tenant.businessId,
      name,
      slug: value(formData, "slug") || slugify(name),
      address: value(formData, "address") || null,
      phone: value(formData, "phone") || null,
      currency: value(formData, "currency") || tenant.currentBusiness?.currency || "USD",
      exchangeRate: value(formData, "exchangeRate") || tenant.currentBusiness?.exchangeRate || "1",
      isMain: formData.get("isMain") === "on",
      isActive: true,
    },
  });

  revalidatePath("/dashboard/branches");
}
