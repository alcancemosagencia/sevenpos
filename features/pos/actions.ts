"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";
import type { PaymentMethod } from "@/features/pos/types";
import { getCurrentBranchForUser } from "@/features/branches/branch-context";
import { writeAuditLog, writeProductHistory } from "@/features/audit/log";

export type CheckoutInput = {
  requestId?: string;
  paymentMethod: PaymentMethod;
  currency: "USD" | "BS";
  cashReceivedUsd?: number;
  cashReceivedBs?: number;
  preSaleId?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type CheckoutResult = {
  ok: boolean;
  saleId?: string;
  error?: string;
};

const checkoutLocks = new Map<string, number>();
const checkoutTtlMs = 12_000;

function acquireCheckoutLock(key: string) {
  const now = Date.now();
  for (const [lockKey, expiresAt] of checkoutLocks) {
    if (expiresAt <= now) checkoutLocks.delete(lockKey);
  }
  if (checkoutLocks.has(key)) return false;
  checkoutLocks.set(key, now + checkoutTtlMs);
  return true;
}

export async function checkoutAction(input: CheckoutInput): Promise<CheckoutResult> {
  try {
    const tenant = await requireTenantContext();
    const businessId = tenant.businessId;

    if (!businessId || !can(tenant.currentUser.role, "sales:create")) {
      return { ok: false, error: "No tienes permiso para crear ventas." };
    }

    if (input.items.length === 0) {
      return { ok: false, error: "Agrega productos al carrito." };
    }
    if (!tenant.hasFeature("POS")) {
      return { ok: false, error: "Tu plan no incluye POS." };
    }

    const lockKey = `${businessId}:${tenant.currentUser.id}:${input.requestId ?? JSON.stringify(input.items)}`;
    if (!acquireCheckoutLock(lockKey)) {
      return { ok: false, error: "Venta en proceso. Espera un momento." };
    }

    const sale = await prisma.$transaction(async (tx) => {
      const branch = await getCurrentBranchForUser(businessId, tenant.currentUser.id);
      const business = await tx.business.findUnique({
        where: { id: businessId },
        select: { exchangeRate: true },
      });
      const exchangeRate = Math.max(0.0001, Number(business?.exchangeRate.toString() ?? "1"));

      const cashSession = await tx.cashSession.findFirst({
        where: { businessId, branchId: branch.id, status: "OPEN" },
        select: { id: true },
      });

      if (!cashSession) {
        throw new Error("Debes abrir caja antes de vender.");
      }

      const productIds = input.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          businessId,
          isActive: true,
        },
      });
      const inventories = await tx.branchInventory.findMany({
        where: {
          businessId,
          branchId: branch.id,
          productId: { in: productIds },
        },
      });

      if (products.length !== productIds.length) {
        throw new Error("Uno o mas productos no estan disponibles.");
      }

      if (input.preSaleId) {
        const preSale = await tx.preSale.findFirst({
          where: { id: input.preSaleId, businessId, branchId: branch.id, status: "OPEN" },
          select: { id: true },
        });

        if (!preSale) {
          throw new Error("La preventa ya no esta disponible.");
        }
      }

      const lineItems = input.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);

        if (!product) {
          throw new Error("Producto no encontrado.");
        }

        const rawQuantity = Number(item.quantity);
        const quantity = Math.max(0.001, Number.isFinite(rawQuantity) ? rawQuantity : 1);

        const inventory = inventories.find((candidate) => candidate.productId === product.id);
        const branchStock = inventory ? Number(inventory.stock.toString()) : product.stock;

        if (branchStock < quantity) {
          throw new Error(`Stock insuficiente para ${product.name}.`);
        }

        const unitPrice = input.currency === "BS" ? product.priceUsd.mul(exchangeRate.toString()) : product.priceUsd;
        const subtotal = unitPrice.mul(quantity.toString());

        return {
          product,
          quantity,
          quantityInt: Math.max(1, Math.ceil(quantity)),
          unitPrice,
          subtotal,
        };
      });

      const subtotal = lineItems.reduce((sum, item) => sum.add(item.subtotal), lineItems[0].subtotal.mul(0));
      const subtotalNumber = Number(subtotal.toString());
      const totalUsd = input.currency === "BS" ? subtotalNumber / exchangeRate : subtotalNumber;
      const receivedUsd = Math.max(0, input.cashReceivedUsd ?? 0);
      const receivedBs = Math.max(0, input.cashReceivedBs ?? 0);

      if (receivedUsd > 0 || receivedBs > 0) {
        const paidAsUsd = receivedUsd + receivedBs / exchangeRate;
        if (paidAsUsd + 0.01 < totalUsd) {
          throw new Error("El pago no cubre el total de la venta.");
        }
      }

      const createdSale = await tx.sale.create({
        data: {
          businessId,
          branchId: branch.id,
          subtotal,
          total: subtotal,
          currency: input.currency,
          paymentMethod: input.paymentMethod,
          cashierId: tenant.currentUser.id,
          items: {
            create: lineItems.map((item) => ({
              productId: item.product.id,
              quantity: item.quantityInt,
              quantityDecimal: item.quantity.toString(),
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
      });

      for (const item of lineItems) {
        await tx.branchInventory.upsert({
          where: {
            branchId_productId: {
              branchId: branch.id,
              productId: item.product.id,
            },
          },
          create: {
            businessId,
            branchId: branch.id,
            productId: item.product.id,
            stock: Math.max(0, item.product.stock - item.quantity).toString(),
            lowStockAlert: item.product.lowStockAlert.toString(),
          },
          update: {
            stock: {
              decrement: item.quantity.toString(),
            },
          },
        });
      }

      for (const item of lineItems) {
        await writeProductHistory(
          {
            businessId,
            branchId: branch.id,
            productId: item.product.id,
            userId: tenant.currentUser.id,
            type: "SALE_STOCK_DECREMENT",
            afterValue: { quantity: item.quantity, saleId: createdSale.id },
            note: "Descuento automatico por venta",
          },
          tx,
        );
      }

      if (input.paymentMethod === "CASH_USD" || input.paymentMethod === "CASH_BS") {
        const cashAmountUsd =
          receivedUsd > 0 || receivedBs > 0
            ? receivedUsd
            : input.currency === "USD"
              ? subtotalNumber
              : 0;
        const cashAmountBs =
          receivedUsd > 0 || receivedBs > 0
            ? receivedBs
            : input.currency === "BS"
              ? subtotalNumber
              : 0;

        await tx.cashMovement.create({
          data: {
            businessId,
            branchId: branch.id,
            cashSessionId: cashSession.id,
            type: "SALE",
            amountUsd: cashAmountUsd.toFixed(2),
            amountBs: cashAmountBs.toFixed(2),
            note: `Venta ${createdSale.id}`,
            createdById: tenant.currentUser.id,
          },
        });
      }

      if (input.preSaleId) {
        await tx.preSale.update({
          where: { id: input.preSaleId },
          data: { status: "PAID" },
        });
      }

      await writeAuditLog(
        {
          businessId,
          branchId: branch.id,
          userId: tenant.currentUser.id,
          action: "SALE_CREATED",
          module: "POS",
          metadata: {
            saleId: createdSale.id,
            total: subtotalNumber,
            paymentMethod: input.paymentMethod,
            preSaleId: input.preSaleId ?? null,
          },
        },
        tx,
      );

      return createdSale;
    });

    revalidatePath("/pos");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/pre-sales");

    return { ok: true, saleId: sale.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No pudimos registrar la venta.",
    };
  }
}
