import { can } from "@/lib/rbac";
import { logger } from "@/lib/logger";
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

export async function performCheckout(input: CheckoutInput): Promise<CheckoutResult> {
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

    const branch = await getCurrentBranchForUser(businessId, tenant.currentUser.id);
    const exchangeRate = Math.max(0.0001, Number(tenant.currentBusiness?.exchangeRate?.toString() ?? "1"));
    const requestedItems = Array.from(
      input.items
        .reduce((items, item) => {
          const rawQuantity = Number(item.quantity);
          const quantity = Math.max(0.001, Number.isFinite(rawQuantity) ? rawQuantity : 1);
          items.set(item.productId, (items.get(item.productId) ?? 0) + quantity);
          return items;
        }, new Map<string, number>())
        .entries(),
    ).map(([productId, quantity]) => ({ productId, quantity }));
    const productIds = requestedItems.map((item) => item.productId);

    const taxSettings = await prisma.businessTaxSettings.findUnique({
      where: { businessId },
      select: {
        taxesEnabled: true,
        ivaRate: true,
        customTaxRate: true,
        tipsEnabled: true,
        tipRate: true,
        tipMode: true,
      },
    });

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        priceUsd: true,
        stock: true,
        lowStockAlert: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error("Uno o más productos no están disponibles.");
    }

    const inventories = await prisma.branchInventory.findMany({
      where: {
        businessId,
        branchId: branch.id,
        productId: { in: productIds },
      },
      select: {
        productId: true,
        stock: true,
      },
    });

    const inventoryByProductId = new Map(
      inventories.map((inventory) => [inventory.productId, Number(inventory.stock.toString())]),
    );
    const missingInventoryProducts = products.filter((product) => !inventoryByProductId.has(product.id));

    if (missingInventoryProducts.length > 0) {
      await prisma.branchInventory.createMany({
        data: missingInventoryProducts.map((product) => ({
          businessId,
          branchId: branch.id,
          productId: product.id,
          stock: product.stock.toString(),
          lowStockAlert: product.lowStockAlert.toString(),
        })),
        skipDuplicates: true,
      });

      for (const product of missingInventoryProducts) {
        inventoryByProductId.set(product.id, product.stock);
      }
    }

    const lineItems = requestedItems.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);

      if (!product) {
        throw new Error("Producto no encontrado.");
      }

      const branchStock = inventoryByProductId.get(product.id) ?? product.stock;

      if (branchStock < item.quantity) {
        throw new Error(`Stock insuficiente para ${product.name}.`);
      }

      const unitPrice = input.currency === "BS" ? product.priceUsd.mul(exchangeRate.toString()) : product.priceUsd;
      const subtotal = unitPrice.mul(item.quantity.toString());

      return {
        product,
        quantity: item.quantity,
        quantityInt: Math.max(1, Math.ceil(item.quantity)),
        unitPrice,
        subtotal,
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum.add(item.subtotal), lineItems[0].subtotal.mul(0));
    const taxRate = taxSettings?.taxesEnabled
      ? Number(taxSettings.ivaRate.toString()) + Number(taxSettings.customTaxRate.toString())
      : 0;
    const tipRate = taxSettings?.tipsEnabled && taxSettings.tipMode === "AUTO" ? Number(taxSettings.tipRate.toString()) : 0;
    const taxTotal = subtotal.mul(taxRate.toString()).div(100);
    const tipTotal = subtotal.mul(tipRate.toString()).div(100);
    const total = subtotal.add(taxTotal).add(tipTotal);
    const totalNumber = Number(total.toString());
    const totalUsd = input.currency === "BS" ? totalNumber / exchangeRate : totalNumber;
    const receivedUsd = Math.max(0, input.cashReceivedUsd ?? 0);
    const receivedBs = Math.max(0, input.cashReceivedBs ?? 0);

    if (receivedUsd > 0 || receivedBs > 0) {
      const paidAsUsd = receivedUsd + receivedBs / exchangeRate;
      if (paidAsUsd + 0.01 < totalUsd) {
        throw new Error("El pago no cubre el total de la venta.");
      }
    }

    const sale = await prisma.$transaction(async (tx) => {
      const cashSession = await tx.cashSession.findFirst({
        where: { businessId, branchId: branch.id, status: "OPEN" },
        select: { id: true },
      });

      if (!cashSession) {
        throw new Error("Debes abrir caja antes de vender.");
      }

      if (input.preSaleId) {
        const preSaleUpdate = await tx.preSale.updateMany({
          where: { id: input.preSaleId, businessId, branchId: branch.id, status: "OPEN" },
          data: { status: "PAID" },
        });

        if (preSaleUpdate.count !== 1) {
          throw new Error("La preventa ya no está disponible.");
        }
      }

      for (const item of lineItems) {
        const stockUpdate = await tx.branchInventory.updateMany({
          where: {
            businessId,
            branchId: branch.id,
            productId: item.product.id,
            stock: { gte: item.quantity.toString() },
          },
          data: {
            stock: {
              decrement: item.quantity.toString(),
            },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new Error(`Stock insuficiente para ${item.product.name}.`);
        }
      }

      const createdSale = await tx.sale.create({
        data: {
          businessId,
          branchId: branch.id,
          subtotal,
          taxTotal,
          tipTotal,
          total,
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

      if (input.paymentMethod === "CASH_USD" || input.paymentMethod === "CASH_BS") {
        const cashAmountUsd =
          receivedUsd > 0 || receivedBs > 0
            ? receivedUsd
            : input.currency === "USD"
              ? totalNumber
              : 0;
        const cashAmountBs =
          receivedUsd > 0 || receivedBs > 0
            ? receivedBs
            : input.currency === "BS"
              ? totalNumber
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

      return createdSale;
    });

    try {
      await Promise.all([
        writeAuditLog({
          businessId,
          branchId: branch.id,
          userId: tenant.currentUser.id,
          action: "SALE_CREATED",
          module: "POS",
          metadata: {
            saleId: sale.id,
            total: totalNumber,
            taxTotal: Number(taxTotal.toString()),
            tipTotal: Number(tipTotal.toString()),
            paymentMethod: input.paymentMethod,
            preSaleId: input.preSaleId ?? null,
          },
        }),
        ...lineItems.map((item) =>
          writeProductHistory({
            businessId,
            branchId: branch.id,
            productId: item.product.id,
            userId: tenant.currentUser.id,
            type: "SALE_STOCK_DECREMENT",
            afterValue: { quantity: item.quantity, saleId: sale.id },
            note: "Descuento automático por venta",
          }),
        ),
      ]);
    } catch (auditError) {
      logger.warn("La venta se registró, pero falló el registro secundario de auditoría.", {
        saleId: sale.id,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      });
    }

    return { ok: true, saleId: sale.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No pudimos registrar la venta.",
    };
  }
}
