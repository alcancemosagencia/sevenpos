"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isBusinessOpen, publicCurrency } from "@/features/public-ordering/format";
import type { FulfillmentMethod } from "@/features/public-ordering/types";

type PublicOrderInput = {
  businessId: string;
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
    where: { id: input.businessId, slug: input.businessSlug },
    include: { publicSettings: true },
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

  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { businessId: business.id, id: { in: input.items.map((item) => item.productId) }, isActive: true, isPublic: true },
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

    return tx.publicOrder.create({
      data: {
        businessId: business.id,
        code,
        fulfillmentMethod: input.fulfillmentMethod,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        address: input.address?.trim() || null,
        addressReference: input.addressReference?.trim() || null,
        lat: typeof input.lat === "number" ? input.lat.toFixed(7) : null,
        lng: typeof input.lng === "number" ? input.lng.toFixed(7) : null,
        notes: input.notes?.trim() || null,
        paymentMethod: input.paymentMethod,
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
  return { ok: true, code: order.code };
}
