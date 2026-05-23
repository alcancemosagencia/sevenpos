"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isBusinessOpen, paymentStatusForType, publicCurrency, resolvePaymentOptions } from "@/features/public-ordering/format";
import type { FulfillmentMethod, PublicPaymentMethodType } from "@/features/public-ordering/types";
import type { PaymentMethod } from "@prisma/client";

type PublicOrderInput = {
  businessSlug: string;
  fulfillmentMethod: FulfillmentMethod;
  customerName: string;
  customerPhone: string;
  address?: string;
  addressReference?: string;
  lat?: number | null;
  lng?: number | null;
  notes?: string;
  paymentMethod: string;
  acceptedTerms: boolean;
  items: Array<{ productId: string; quantity: number }>;
};

export async function createPublicOrderAction(input: PublicOrderInput) {
  if (!input.acceptedTerms) return { ok: false, error: "Debes aceptar términos y condiciones." };
  if (!input.customerName.trim() || !input.customerPhone.trim()) return { ok: false, error: "Completa tus datos de contacto." };
  if (input.items.length === 0) return { ok: false, error: "Agrega productos al carrito." };

  const business = await prisma.business.findUnique({
    where: { slug: input.businessSlug },
    select: {
      id: true,
      slug: true,
      status: true,
      country: true,
      currency: true,
      publicSettings: true,
      paymentMethods: {
        where: { enabled: true },
        select: {
          id: true,
          type: true,
          enabled: true,
          title: true,
          instructions: true,
          alias: true,
          phone: true,
          email: true,
          qrImage: true,
        },
      },
      branches: {
        where: { isActive: true },
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
        select: { id: true },
        take: 1,
      },
      users: {
        where: { isActive: true, role: { in: ["OWNER", "ADMIN", "MANAGER", "CASHIER"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!business || business.status !== "ACTIVE") return { ok: false, error: "Este negocio no está disponible." };

  const settings = business.publicSettings ?? {
    deliveryEnabled: true,
    pickupEnabled: true,
    dineInEnabled: false,
    activeDays: "1,2,3,4,5,6",
    openTime: "09:00",
    closeTime: "21:00",
    deliveryFee: 0,
    taxRate: 0,
  };

  if (!isBusinessOpen(settings.activeDays, settings.openTime, settings.closeTime)) {
    return { ok: false, error: "El negocio está cerrado actualmente." };
  }

  const methodAllowed =
    (input.fulfillmentMethod === "DELIVERY" && settings.deliveryEnabled) ||
    (input.fulfillmentMethod === "PICKUP" && settings.pickupEnabled) ||
    (input.fulfillmentMethod === "DINE_IN" && settings.dineInEnabled);

  if (!methodAllowed) return { ok: false, error: "Método de entrega no disponible." };
  if (input.fulfillmentMethod === "DELIVERY" && !input.address?.trim()) return { ok: false, error: "Agrega una dirección de entrega." };

  const branch = business.branches[0] ?? null;
  const operator = business.users[0] ?? null;
  if (!operator) return { ok: false, error: "El negocio no tiene un operador activo para registrar ventas online." };

  const paymentOptions = resolvePaymentOptions(business.paymentMethods);
  const selectedPayment = paymentOptions.find((method) => method.value === input.paymentMethod);
  if (!selectedPayment) return { ok: false, error: "Metodo de pago no disponible." };

  const publicPaymentType = selectedPayment.value as PublicPaymentMethodType;
  const salePaymentMethod: PaymentMethod =
    publicPaymentType === "CASH"
      ? "CASH_USD"
      : publicPaymentType === "MOBILE_PAYMENT"
        ? "MOBILE_PAYMENT"
        : "BANK_TRANSFER";
  const paymentStatus = paymentStatusForType(publicPaymentType);

  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { businessId: business.id, id: { in: input.items.map((item) => item.productId) }, isActive: true, isPublic: true },
      select: {
        id: true,
        name: true,
        priceUsd: true,
        stock: true,
        lowStockAlert: true,
      },
    });

    if (products.length !== input.items.length) throw new Error("Uno o más productos no están disponibles.");

    const lines = input.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) throw new Error("Producto no encontrado.");
      const quantity = Math.max(1, Math.floor(Number(item.quantity)));
      if (product.stock < quantity) throw new Error(`Stock insuficiente para ${product.name}.`);
      const unitPrice = Number(product.priceUsd.toString());
      return {
        product,
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const deliveryFee = input.fulfillmentMethod === "DELIVERY" ? Number(settings.deliveryFee.toString()) : 0;
    const tax = subtotal * (Number(settings.taxRate.toString()) / 100);
    const total = subtotal + deliveryFee + tax;
    const count = await tx.publicOrder.count({ where: { businessId: business.id } });
    const code = `W${String(count + 1).padStart(4, "0")}`;

    if (branch) {
      const existingInventory = await tx.branchInventory.findMany({
        where: {
          businessId: business.id,
          branchId: branch.id,
          productId: { in: lines.map((line) => line.product.id) },
        },
        select: { productId: true },
      });
      const existingInventoryIds = new Set(existingInventory.map((item) => item.productId));
      const missingInventory = lines.filter((line) => !existingInventoryIds.has(line.product.id));

      if (missingInventory.length > 0) {
        await tx.branchInventory.createMany({
          data: missingInventory.map((line) => ({
            businessId: business.id,
            branchId: branch.id,
            productId: line.product.id,
            stock: line.product.stock.toString(),
            lowStockAlert: line.product.lowStockAlert.toString(),
          })),
          skipDuplicates: true,
        });
      }
    }

    for (const line of lines) {
      const productUpdate = await tx.product.updateMany({
        where: { id: line.product.id, businessId: business.id, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });

      if (productUpdate.count !== 1) throw new Error(`Stock insuficiente para ${line.product.name}.`);

      if (branch) {
        const inventoryUpdate = await tx.branchInventory.updateMany({
          where: {
            businessId: business.id,
            branchId: branch.id,
            productId: line.product.id,
            stock: { gte: line.quantity.toString() },
          },
          data: { stock: { decrement: line.quantity.toString() } },
        });

        if (inventoryUpdate.count !== 1) throw new Error(`Stock insuficiente para ${line.product.name}.`);
      }
    }

    const sale = await tx.sale.create({
      data: {
        businessId: business.id,
        branchId: branch?.id ?? null,
        subtotal: subtotal.toFixed(2),
        taxTotal: tax.toFixed(2),
        tipTotal: "0",
        total: total.toFixed(2),
        currency: "USD",
        paymentMethod: salePaymentMethod,
        cashierId: operator.id,
        items: {
          create: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
            quantityDecimal: line.quantity.toString(),
            unitPrice: line.unitPrice.toFixed(2),
            subtotal: line.subtotal.toFixed(2),
          })),
        },
      },
    });

    const openCashSession = branch
      ? await tx.cashSession.findFirst({
          where: { businessId: business.id, branchId: branch.id, status: "OPEN" },
          select: { id: true },
        })
      : null;

    if (openCashSession && salePaymentMethod === "CASH_USD") {
      await tx.cashMovement.create({
        data: {
          businessId: business.id,
          branchId: branch?.id ?? null,
          cashSessionId: openCashSession.id,
          type: "SALE",
          amountUsd: total.toFixed(2),
          amountBs: "0",
          note: `Pedido online ${code}`,
          createdById: operator.id,
        },
      });
    }

    return tx.publicOrder.create({
      data: {
        businessId: business.id,
        branchId: branch?.id ?? null,
        saleId: sale.id,
        code,
        fulfillmentMethod: input.fulfillmentMethod,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        address: input.address?.trim() || null,
        addressReference: input.addressReference?.trim() || null,
        lat: typeof input.lat === "number" ? input.lat.toFixed(7) : null,
        lng: typeof input.lng === "number" ? input.lng.toFixed(7) : null,
        notes: input.notes?.trim() || null,
        paymentMethod: selectedPayment.title,
        paymentStatus,
        subtotal: subtotal.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        currency: publicCurrency(business.country, business.currency),
        items: {
          create: lines.map((line) => ({
            productId: line.product.id,
            name: line.product.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice.toFixed(2),
            subtotal: line.subtotal.toFixed(2),
          })),
        },
      },
    });
  });

  revalidatePath(`/${business.slug}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true, id: order.id, code: order.code, status: order.status, createdAt: order.createdAt.toISOString() };
}
