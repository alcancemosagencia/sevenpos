"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { slugify } from "@/lib/slug";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

async function requireBusiness() {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) throw new Error("Negocio no disponible.");
  return { ...tenant, businessId: tenant.businessId };
}

export async function createCustomerAction(formData: FormData) {
  const tenant = await requireBusiness();
  if (!can(tenant.currentUser.role, "customers:view")) throw new Error("No tienes permiso para clientes.");
  if (!tenant.hasFeature("CRM")) throw new Error("Tu plan no incluye CRM.");

  const name = readString(formData, "name");
  if (!name) return;

  await prisma.customer.create({
    data: {
      businessId: tenant.businessId,
      name,
      email: readString(formData, "email") || null,
      phone: readString(formData, "phone") || null,
    },
  });

  revalidatePath("/customers");
}

export async function createExpenseAction(formData: FormData) {
  const tenant = await requireBusiness();
  if (!can(tenant.currentUser.role, "expenses:view")) throw new Error("No tienes permiso para gastos.");

  const description = readString(formData, "description");
  const amount = Math.max(0, readNumber(formData, "amount"));
  if (!description || amount <= 0) return;

  await prisma.expense.create({
    data: {
      businessId: tenant.businessId,
      description,
      amount: amount.toString(),
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function adjustStockAction(formData: FormData) {
  const tenant = await requireBusiness();
  if (!can(tenant.currentUser.role, "products:manage")) throw new Error("No tienes permiso para inventario.");
  if (!tenant.hasFeature("inventario")) throw new Error("Tu plan no incluye inventario.");

  const productId = readString(formData, "productId");
  const stock = Math.max(0, Math.trunc(readNumber(formData, "stock")));
  if (!productId) return;

  await prisma.product.update({
    where: { id: productId, businessId: tenant.businessId },
    data: { stock },
  });

  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/pos");
}

export async function updateBusinessNameAction(formData: FormData) {
  const tenant = await requireBusiness();
  if (!can(tenant.currentUser.role, "settings:access")) throw new Error("No tienes permiso para ajustes.");
  if (!tenant.hasFeature("menú público")) throw new Error("Tu plan no incluye menú público.");

  const name = readString(formData, "name");
  if (!name) return;

  await prisma.business.update({
    where: { id: tenant.businessId },
    data: { name },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateBusinessProfileAction(formData: FormData) {
  const tenant = await requireBusiness();
  if (!can(tenant.currentUser.role, "settings:access")) throw new Error("No tienes permiso para ajustes.");

  const name = readString(formData, "name");
  if (!name) return;

  await prisma.business.update({
    where: { id: tenant.businessId },
    data: {
      name,
      email: readString(formData, "email") || null,
      slug: slugify(readString(formData, "slug") || name),
      phone: readString(formData, "phone") || null,
      address: readString(formData, "address") || null,
      city: readString(formData, "city") || null,
      country: readString(formData, "country") || null,
      currency: readString(formData, "currency") || "USD",
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  if (tenant.currentBusiness?.slug) revalidatePath(`/${tenant.currentBusiness.slug}`);
}

export async function requestPlanUpgradeAction(formData: FormData) {
  const tenant = await requireBusiness();
  if (!can(tenant.currentUser.role, "settings:access")) throw new Error("No tienes permiso para ajustes.");

  const planId = readString(formData, "planId");
  if (!planId) return { ok: false, error: "Plan requerido." };

  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { name: true } });
  if (!plan) return { ok: false, error: "Plan no encontrado." };

  return { ok: true, message: `Solicitud preparada para actualizar a ${plan.name}.` };
}

export async function updateExchangeRateAction(formData: FormData) {
  const tenant = await requireBusiness();
  if (!can(tenant.currentUser.role, "settings:access")) throw new Error("No tienes permiso para ajustes.");

  const exchangeRate = Math.max(0, readNumber(formData, "exchangeRate", 1));
  if (exchangeRate <= 0) return;

  await prisma.business.update({
    where: { id: tenant.businessId },
    data: { exchangeRate: exchangeRate.toString() },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
}

export async function updatePublicOrderingSettingsAction(formData: FormData) {
  const tenant = await requireBusiness();
  if (!can(tenant.currentUser.role, "settings:access")) throw new Error("No tienes permiso para ajustes.");

  const activeDays = formData
    .getAll("activeDays")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(",");

  const deliveryFee = Math.max(0, readNumber(formData, "deliveryFee"));
  const taxRate = Math.max(0, readNumber(formData, "taxRate"));
  const rating = Math.min(5, Math.max(0, readNumber(formData, "rating", 4.8)));

  await prisma.businessPublicSettings.upsert({
    where: { businessId: tenant.businessId },
    create: {
      businessId: tenant.businessId,
      coverImageUrl: readString(formData, "coverImageUrl") || null,
      logoUrl: readString(formData, "logoUrl") || null,
      rating: rating.toString(),
      distanceLabel: readString(formData, "distanceLabel") || "0.8 km",
      etaLabel: readString(formData, "etaLabel") || "25-35 min",
      deliveryEnabled: formData.get("deliveryEnabled") === "on",
      pickupEnabled: formData.get("pickupEnabled") === "on",
      dineInEnabled: formData.get("dineInEnabled") === "on",
      openTime: readString(formData, "openTime") || "09:00",
      closeTime: readString(formData, "closeTime") || "21:00",
      activeDays: activeDays || "1,2,3,4,5,6",
      deliveryFee: deliveryFee.toString(),
      taxRate: taxRate.toString(),
      termsUrl: readString(formData, "termsUrl") || null,
    },
    update: {
      coverImageUrl: readString(formData, "coverImageUrl") || null,
      logoUrl: readString(formData, "logoUrl") || null,
      rating: rating.toString(),
      distanceLabel: readString(formData, "distanceLabel") || "0.8 km",
      etaLabel: readString(formData, "etaLabel") || "25-35 min",
      deliveryEnabled: formData.get("deliveryEnabled") === "on",
      pickupEnabled: formData.get("pickupEnabled") === "on",
      dineInEnabled: formData.get("dineInEnabled") === "on",
      openTime: readString(formData, "openTime") || "09:00",
      closeTime: readString(formData, "closeTime") || "21:00",
      activeDays: activeDays || "1,2,3,4,5,6",
      deliveryFee: deliveryFee.toString(),
      taxRate: taxRate.toString(),
      termsUrl: readString(formData, "termsUrl") || null,
    },
  });

  revalidatePath("/settings");
  if (tenant.currentBusiness?.slug) revalidatePath(`/${tenant.currentBusiness.slug}`);
}

export async function createCategoryAction(formData: FormData) {
  const tenant = await requireBusiness();
  if (!can(tenant.currentUser.role, "products:manage")) throw new Error("No tienes permiso para categorías.");

  const name = readString(formData, "name");
  if (!name) return;

  await prisma.category.upsert({
    where: { businessId_name: { businessId: tenant.businessId, name } },
    create: { businessId: tenant.businessId, name },
    update: {},
  });

  revalidatePath("/settings");
  revalidatePath("/products");
  revalidatePath("/pos");
}
