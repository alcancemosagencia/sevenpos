"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/rbac";
import { requireTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { getCurrentBranchForUser } from "@/features/branches/branch-context";
import { writeAuditLog, writeProductHistory } from "@/features/audit/log";

export type ProductActionState = {
  error?: string;
  ok?: boolean;
};

function value(formData: FormData, key: string) {
  const input = formData.get(key);
  return typeof input === "string" ? input.trim() : "";
}

function optionalValue(formData: FormData, key: string) {
  const input = value(formData, key);
  return input.length > 0 ? input : null;
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const parsed = Number(value(formData, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function checked(formData: FormData, key: string) {
  return formData.getAll(key).includes("on");
}

async function requireProductManager() {
  const tenant = await requireTenantContext();
  const businessId = tenant.businessId;

  if (!businessId || !can(tenant.currentUser.role, "products:manage")) {
    throw new Error("No tienes permiso para gestionar productos.");
  }
  if (!tenant.hasFeature("inventario")) {
    throw new Error("Tu plan no incluye gestión de productos.");
  }

  return { ...tenant, businessId };
}

async function resolveCategory(businessId: string, categoryName: string | null) {
  if (!categoryName) return null;

  const category = await prisma.category.upsert({
    where: {
      businessId_name: {
        businessId,
        name: categoryName,
      },
    },
    create: {
      businessId,
      name: categoryName,
    },
    update: {},
  });

  return category.id;
}

export async function createProductAction(
  _state: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const tenant = await requireProductManager();
    const name = value(formData, "name");
    const priceUsd = numberValue(formData, "priceUsd");
    const priceBs = numberValue(formData, "priceBs");

    if (!name || priceUsd <= 0) {
      return { error: "Nombre y precio USD son obligatorios." };
    }

    const categoryId = await resolveCategory(tenant.businessId, optionalValue(formData, "category"));
    const branch = await getCurrentBranchForUser(tenant.businessId, tenant.currentUser.id);
    const sku = optionalValue(formData, "sku");
    const barcode = optionalValue(formData, "barcode");

    if (sku || barcode) {
      const duplicate = await prisma.product.findFirst({
        where: {
          businessId: tenant.businessId,
          OR: [sku ? { sku } : undefined, barcode ? { barcode } : undefined].filter(Boolean) as Array<{ sku: string } | { barcode: string }>,
        },
        select: { id: true },
      });
      if (duplicate) return { error: "SKU o barcode ya existe en este negocio." };
    }

    const product = await prisma.product.create({
      data: {
        businessId: tenant.businessId,
        name,
        description: optionalValue(formData, "description"),
        imageUrl: optionalValue(formData, "imageUrl"),
        categoryId,
        priceUsd: priceUsd.toString(),
        priceBs: Math.max(0, priceBs).toString(),
        stock: Math.max(0, Math.trunc(numberValue(formData, "stock"))),
        lowStockAlert: Math.max(0, Math.trunc(numberValue(formData, "lowStockAlert", 5))),
        sku,
        barcode,
        allowVariablePrice: value(formData, "allowVariablePrice") === "on",
        soldByWeight: value(formData, "soldByWeight") === "on",
        unit: (value(formData, "unit") || "UNIT") as "UNIT" | "KG" | "GR" | "LT" | "ML" | "MT",
        isActive: true,
        isPublic: checked(formData, "isPublic"),
      },
    });

    await prisma.branchInventory.create({
      data: {
        businessId: tenant.businessId,
        branchId: branch.id,
        productId: product.id,
        stock: Math.max(0, Math.trunc(numberValue(formData, "stock"))).toString(),
        lowStockAlert: Math.max(0, Math.trunc(numberValue(formData, "lowStockAlert", 5))).toString(),
      },
    });

    await writeAuditLog({
      businessId: tenant.businessId,
      branchId: branch.id,
      userId: tenant.currentUser.id,
      action: "PRODUCT_CREATED",
      module: "PRODUCTS",
      metadata: { productId: product.id, name: product.name, priceUsd },
    });
    await writeProductHistory({
      businessId: tenant.businessId,
      branchId: branch.id,
      productId: product.id,
      userId: tenant.currentUser.id,
      type: "PRODUCT_CREATED",
      afterValue: { priceUsd, stock: numberValue(formData, "stock") },
    });

    revalidatePath("/products");
    revalidatePath("/pos");
    if (tenant.currentBusiness?.slug) revalidatePath(`/${tenant.currentBusiness.slug}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos crear el producto." };
  }
}

export async function updateProductAction(
  _state: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const tenant = await requireProductManager();
    const productId = value(formData, "productId");
    const name = value(formData, "name");
    const priceUsd = numberValue(formData, "priceUsd");
    const priceBs = numberValue(formData, "priceBs");

    if (!productId || !name || priceUsd <= 0) {
      return { error: "Producto, nombre y precio USD son obligatorios." };
    }

    const categoryId = await resolveCategory(tenant.businessId, optionalValue(formData, "category"));
    const sku = optionalValue(formData, "sku");
    const barcode = optionalValue(formData, "barcode");

    if (sku || barcode) {
      const duplicate = await prisma.product.findFirst({
        where: {
          businessId: tenant.businessId,
          id: { not: productId },
          OR: [sku ? { sku } : undefined, barcode ? { barcode } : undefined].filter(Boolean) as Array<{ sku: string } | { barcode: string }>,
        },
        select: { id: true },
      });
      if (duplicate) return { error: "SKU o barcode ya existe en este negocio." };
    }

    const before = await prisma.product.findFirst({
      where: { id: productId, businessId: tenant.businessId },
      select: { priceUsd: true, priceBs: true, stock: true, lowStockAlert: true, name: true },
    });

    await prisma.product.update({
      where: {
        id: productId,
        businessId: tenant.businessId,
      },
      data: {
        name,
        description: optionalValue(formData, "description"),
        imageUrl: optionalValue(formData, "imageUrl"),
        categoryId,
        priceUsd: priceUsd.toString(),
        priceBs: Math.max(0, priceBs).toString(),
        stock: Math.max(0, Math.trunc(numberValue(formData, "stock"))),
        lowStockAlert: Math.max(0, Math.trunc(numberValue(formData, "lowStockAlert", 5))),
        sku,
        barcode,
        allowVariablePrice: value(formData, "allowVariablePrice") === "on",
        soldByWeight: value(formData, "soldByWeight") === "on",
        unit: (value(formData, "unit") || "UNIT") as "UNIT" | "KG" | "GR" | "LT" | "ML" | "MT",
        isActive: value(formData, "isActive") === "on",
        isPublic: checked(formData, "isPublic"),
      },
    });

    await writeAuditLog({
      businessId: tenant.businessId,
      userId: tenant.currentUser.id,
      action: "PRODUCT_UPDATED",
      module: "PRODUCTS",
      metadata: { productId, name, priceUsd, stock: numberValue(formData, "stock") },
    });
    await writeProductHistory({
      businessId: tenant.businessId,
      productId,
      userId: tenant.currentUser.id,
      type: "PRODUCT_UPDATED",
      beforeValue: before ? { priceUsd: before.priceUsd.toString(), stock: before.stock, name: before.name } : undefined,
      afterValue: { priceUsd, stock: numberValue(formData, "stock"), name },
    });

    revalidatePath("/products");
    revalidatePath("/pos");
    if (tenant.currentBusiness?.slug) revalidatePath(`/${tenant.currentBusiness.slug}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pudimos actualizar el producto." };
  }
}

export async function toggleProductAction(formData: FormData) {
  const tenant = await requireProductManager();
  const productId = value(formData, "productId");
  const isActive = value(formData, "isActive") === "true";

  await prisma.product.update({
    where: {
      id: productId,
      businessId: tenant.businessId,
    },
    data: { isActive },
  });

  await writeAuditLog({
    businessId: tenant.businessId,
    userId: tenant.currentUser.id,
    action: isActive ? "PRODUCT_ACTIVATED" : "PRODUCT_DEACTIVATED",
    module: "PRODUCTS",
    metadata: { productId },
  });

  revalidatePath("/products");
  revalidatePath("/pos");
}
