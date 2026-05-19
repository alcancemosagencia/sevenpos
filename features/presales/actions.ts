"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import { getCurrentBranchForUser } from "@/features/branches/branch-context";

function value(formData: FormData, key: string) {
  const input = formData.get(key);
  return typeof input === "string" ? input.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const parsed = Number(value(formData, key));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function nextPreSaleCode(branchId: string) {
  const count = await prisma.preSale.count({
    where: {
      branchId,
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  return `A${String(count + 1).padStart(2, "0")}`;
}

export async function createPreSaleAction(formData: FormData) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) throw new Error("Negocio no disponible.");

  const branch = await getCurrentBranchForUser(tenant.businessId, tenant.currentUser.id);
  const rawItems = value(formData, "items");
  const parsedItems = rawItems
    ? (JSON.parse(rawItems) as Array<{ productId: string; quantity: number }>)
    : [{ productId: value(formData, "productId"), quantity: Math.max(1, numberValue(formData, "quantity")) }];
  const inputItems = parsedItems
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(0.001, Number(item.quantity)),
    }))
    .filter((item) => item.productId && Number.isFinite(item.quantity));

  if (inputItems.length === 0) throw new Error("Agrega productos a la preventa.");

  const products = await prisma.product.findMany({
    where: { id: { in: inputItems.map((item) => item.productId) }, businessId: tenant.businessId, isActive: true },
  });

  if (products.length !== inputItems.length) throw new Error("Uno o mas productos no estan disponibles.");

  const lines = inputItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) throw new Error("Producto no encontrado.");
    const subtotal = Number(product.priceUsd.toString()) * item.quantity;
    return { product, quantity: item.quantity, subtotal };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  const code = await nextPreSaleCode(branch.id);

  await prisma.preSale.create({
    data: {
      businessId: tenant.businessId,
      branchId: branch.id,
      createdById: tenant.currentUser.id,
      code,
      notes: value(formData, "notes") || null,
      subtotalUsd: subtotal.toFixed(2),
      totalUsd: subtotal.toFixed(2),
      expiresAt,
      items: {
        create: lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity.toString(),
          unitPriceUsd: line.product.priceUsd,
          subtotalUsd: line.subtotal.toFixed(2),
        })),
      },
    },
  });

  revalidatePath("/pre-sales");
  revalidatePath("/pos");

  return code;
}

export type PreSaleActionState = {
  ok?: boolean;
  code?: string;
  error?: string;
};

export async function createPreSaleFormAction(
  _previousState: PreSaleActionState,
  formData: FormData,
): Promise<PreSaleActionState> {
  try {
    const code = await createPreSaleAction(formData);
    return { ok: true, code };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No pudimos crear la preventa.",
    };
  }
}

export async function cancelPreSaleAction(formData: FormData) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) throw new Error("Negocio no disponible.");
  const preSaleId = value(formData, "preSaleId");

  await prisma.preSale.update({
    where: { id: preSaleId, businessId: tenant.businessId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/pre-sales");
}
