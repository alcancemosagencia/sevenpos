import { redirect } from "next/navigation";
import { OrdersClient } from "@/features/orders/orders-client";
import type { StoreOrder } from "@/features/orders/types";
import { decimalToNumber } from "@/features/pos/format";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { requireTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const tenant = await requireTenantContext();

  if (!tenant.businessId || !can(tenant.currentUser.role, "sales:view") || !tenant.hasFeature("menú público")) {
    redirect("/dashboard");
  }

  const orders = await prisma.publicOrder.findMany({
    where: { businessId: tenant.businessId },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      code: true,
      status: true,
      branchId: true,
      saleId: true,
      fulfillmentMethod: true,
      customerName: true,
      customerPhone: true,
      address: true,
      addressReference: true,
      notes: true,
      paymentMethod: true,
      subtotal: true,
      deliveryFee: true,
      tax: true,
      total: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
        },
      },
    },
  });

  const serializedOrders: StoreOrder[] = orders.map((order) => ({
    id: order.id,
    code: order.code,
    status: order.status,
    branchId: order.branchId,
    saleId: order.saleId,
    fulfillmentMethod: order.fulfillmentMethod,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.address,
    addressReference: order.addressReference,
    notes: order.notes,
    paymentMethod: order.paymentMethod,
    subtotal: decimalToNumber(order.subtotal),
    deliveryFee: decimalToNumber(order.deliveryFee),
    tax: decimalToNumber(order.tax),
    total: decimalToNumber(order.total),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: decimalToNumber(item.unitPrice),
      subtotal: decimalToNumber(item.subtotal),
    })),
  }));

  return <OrdersClient initialOrders={serializedOrders} businessName={tenant.currentBusiness?.name ?? "SevenPOS"} />;
}
