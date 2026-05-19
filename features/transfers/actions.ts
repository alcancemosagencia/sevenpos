"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

function value(formData: FormData, key: string) {
  const input = formData.get(key);
  return typeof input === "string" ? input.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const parsed = Number(value(formData, key));
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function createTransferAction(formData: FormData) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) throw new Error("Negocio no disponible.");
  if (!can(tenant.currentUser.role, "inventory:view") || !tenant.hasFeature("transferencias")) {
    throw new Error("No tienes permiso para transferencias.");
  }
  const businessId = tenant.businessId;

  const fromBranchId = value(formData, "fromBranchId");
  const toBranchId = value(formData, "toBranchId");
  const productId = value(formData, "productId");
  const quantity = numberValue(formData, "quantity");

  if (!fromBranchId || !toBranchId || !productId || quantity <= 0 || fromBranchId === toBranchId) {
    throw new Error("Transferencia invalida.");
  }

  const fromBranch = await prisma.branch.findFirst({ where: { id: fromBranchId, businessId }, select: { id: true } });
  const toBranch = await prisma.branch.findFirst({ where: { id: toBranchId, businessId }, select: { id: true } });
  const product = await prisma.product.findFirst({ where: { id: productId, businessId }, select: { id: true } });
  const inventory = await prisma.branchInventory.findUnique({
    where: { branchId_productId: { branchId: fromBranchId, productId } },
    select: { stock: true },
  });

  if (!fromBranch || !toBranch || !product) throw new Error("Sucursal o producto invalido.");
  if (Number(inventory?.stock.toString() ?? "0") < quantity) throw new Error("Stock insuficiente para transferir.");

  await prisma.stockTransfer.create({
    data: {
      businessId,
      fromBranchId,
      toBranchId,
      createdById: tenant.currentUser.id,
      notes: value(formData, "notes") || null,
      items: {
        create: {
          productId,
          quantity: quantity.toString(),
        },
      },
    },
  });

  revalidatePath("/transfers");
  revalidatePath("/dashboard/branches");
}

export async function updateTransferStatusAction(formData: FormData) {
  const tenant = await requireTenantContext();
  if (!tenant.businessId) throw new Error("Negocio no disponible.");
  if (!can(tenant.currentUser.role, "inventory:view") || !tenant.hasFeature("transferencias")) {
    throw new Error("No tienes permiso para transferencias.");
  }
  const businessId = tenant.businessId;

  const transferId = value(formData, "transferId");
  const status = value(formData, "status") as "APPROVED" | "SHIPPED" | "RECEIVED" | "CANCELLED";

  const transfer = await prisma.stockTransfer.findFirst({
    where: { id: transferId, businessId: tenant.businessId },
    include: { items: true },
  });

  if (!transfer) throw new Error("Transferencia no encontrada.");

  await prisma.$transaction(async (tx) => {
    await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status },
    });

    if (status === "RECEIVED" && transfer.status !== "RECEIVED") {
      const fromBranchId = transfer.fromBranchId ?? "";
      const toBranchId = transfer.toBranchId ?? "";

      if (!fromBranchId || !toBranchId) {
        throw new Error("Transferencia sin sucursal valida.");
      }

      for (const item of transfer.items) {
        const source = await tx.branchInventory.findUnique({
          where: { branchId_productId: { branchId: fromBranchId, productId: item.productId } },
          select: { stock: true },
        });
        if (Number(source?.stock.toString() ?? "0") < Number(item.quantity.toString())) {
          throw new Error("Stock insuficiente para recibir transferencia.");
        }
        await tx.branchInventory.upsert({
            where: { branchId_productId: { branchId: fromBranchId, productId: item.productId } },
            create: {
              businessId,
              branchId: fromBranchId,
              productId: item.productId,
              stock: "0",
            },
            update: { stock: { decrement: item.quantity } },
          });
        await tx.branchInventory.upsert({
            where: { branchId_productId: { branchId: toBranchId, productId: item.productId } },
            create: {
              businessId,
              branchId: toBranchId,
              productId: item.productId,
              stock: item.quantity,
            },
            update: { stock: { increment: item.quantity } },
          });
      }
    }
  });

  revalidatePath("/transfers");
  revalidatePath("/dashboard/branches");
}
