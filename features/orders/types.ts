import type { PublicOrderStatus } from "@prisma/client";

export type StoreOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type StoreOrder = {
  id: string;
  code: string;
  status: PublicOrderStatus;
  fulfillmentMethod: string;
  customerName: string;
  customerPhone: string;
  address: string | null;
  addressReference: string | null;
  notes: string | null;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  currency: string;
  branchId: string | null;
  saleId: string | null;
  createdAt: string;
  updatedAt: string;
  items: StoreOrderItem[];
};

export const publicOrderStatuses: PublicOrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export function orderStatusLabel(status: PublicOrderStatus) {
  const labels: Record<PublicOrderStatus, string> = {
    NEW: "Nuevo",
    CONFIRMED: "Confirmado",
    PREPARING: "Preparando",
    READY: "Listo",
    OUT_FOR_DELIVERY: "En camino",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  };

  return labels[status];
}
