"use client";

import { useMemo, useState, useTransition } from "react";
import type { PublicOrderStatus } from "@prisma/client";
import { Check, CheckCircle2, Clock3, MessageCircle, MoreHorizontal, PackageCheck, Truck, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoreOrder } from "@/features/orders/types";
import { orderStatusLabel, publicOrderStatuses } from "@/features/orders/types";
import { formatPublicMoney } from "@/features/public-ordering/format";

type OrdersClientProps = {
  initialOrders: StoreOrder[];
  businessName: string;
};

const statusTone: Record<PublicOrderStatus, string> = {
  NEW: "bg-blue-50 text-blue-700 ring-blue-100",
  CONFIRMED: "bg-slate-100 text-slate-700 ring-slate-200",
  PREPARING: "bg-amber-50 text-amber-700 ring-amber-100",
  READY: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  OUT_FOR_DELIVERY: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  DELIVERED: "bg-slate-950 text-white ring-slate-950",
  CANCELLED: "bg-red-50 text-red-700 ring-red-100",
};

function orderIcon(status: PublicOrderStatus) {
  if (status === "READY" || status === "DELIVERED") return PackageCheck;
  if (status === "CANCELLED") return XCircle;
  if (status === "PREPARING") return Clock3;
  return Truck;
}

function nextStatusForOrder(order: StoreOrder): PublicOrderStatus | null {
  if (order.status === "NEW") return "CONFIRMED";
  if (order.status === "CONFIRMED") return "PREPARING";
  if (order.status === "PREPARING") return "READY";
  if (order.status === "READY") return order.fulfillmentMethod === "DELIVERY" ? "OUT_FOR_DELIVERY" : "DELIVERED";
  if (order.status === "OUT_FOR_DELIVERY") return "DELIVERED";
  return null;
}

function statusActionLabel(order: StoreOrder) {
  if (order.status === "NEW") return "Aceptar";
  if (order.status === "CONFIRMED") return "Preparar";
  if (order.status === "PREPARING") return "Marcar listo";
  if (order.status === "READY") return order.fulfillmentMethod === "DELIVERY" ? "Enviar" : "Entregar";
  if (order.status === "OUT_FOR_DELIVERY") return "Entregado";
  return null;
}

function fulfillmentLabel(value: string) {
  if (value === "DELIVERY") return "Delivery";
  if (value === "PICKUP") return "Retiro";
  return "Local";
}

function whatsappUrl(order: StoreOrder, status: PublicOrderStatus, businessName: string) {
  const phone = order.customerPhone.replace(/\D/g, "");
  const statusText: Record<PublicOrderStatus, string> = {
    NEW: "recibido",
    CONFIRMED: "aceptado",
    PREPARING: "en preparación",
    READY: "LISTO✅",
    OUT_FOR_DELIVERY: "en camino",
    DELIVERED: "entregado",
    CANCELLED: "cancelado",
  };
  const message = [
    `Hola ${order.customerName},`,
    `¡Tu pedido #${order.code} está ${statusText[status]}!`,
    "",
    `Total: ${formatPublicMoney(order.total, order.currency)}`,
    "",
    `¡Gracias por confiar en ${businessName}!`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function OrdersClient({ initialOrders, businessName }: OrdersClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [activeStatus, setActiveStatus] = useState<PublicOrderStatus | "ALL">("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [preparingOrder, setPreparingOrder] = useState<StoreOrder | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const visibleOrders = useMemo(() => {
    if (activeStatus === "ALL") return orders;
    return orders.filter((order) => order.status === activeStatus);
  }, [activeStatus, orders]);

  const counts = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  function setLocalStatus(orderId: string, status: PublicOrderStatus) {
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order)));
    setPreparingOrder((current) => (current?.id === orderId ? { ...current, status, updatedAt: new Date().toISOString() } : current));
  }

  function updateStatus(orderId: string, status: PublicOrderStatus, afterSave?: () => void) {
    setPendingId(orderId);
    startTransition(async () => {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });

      if (response.ok) {
        setLocalStatus(orderId, status);
        afterSave?.();
      }

      setPendingId(null);
    });
  }

  function openPreparation(order: StoreOrder) {
    setCheckedItems({});
    setPreparingOrder(order);
    if (order.status === "NEW") updateStatus(order.id, "CONFIRMED");
    if (order.status === "CONFIRMED") updateStatus(order.id, "PREPARING");
  }

  function handlePrimaryAction(order: StoreOrder) {
    if (order.status === "NEW" || order.status === "CONFIRMED" || order.status === "PREPARING") {
      openPreparation(order);
      return;
    }

    const nextStatus = nextStatusForOrder(order);
    if (nextStatus) updateStatus(order.id, nextStatus);
  }

  const allPrepared = preparingOrder ? preparingOrder.items.every((item) => checkedItems[item.id]) : false;

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-900">
      <section className="mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">Tienda Online</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Pedidos</h1>
            <p className="text-sm text-slate-500">Operación fullscreen para delivery, retiro y seguimiento.</p>
          </div>
          <div className="rounded-[7px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <span className="font-medium text-slate-900">{orders.length}</span> pedidos recientes
          </div>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setActiveStatus("ALL")}
            className={`shrink-0 rounded-[7px] px-3 py-2 text-xs font-medium transition ${activeStatus === "ALL" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            Todos ({orders.length})
          </button>
          {publicOrderStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`shrink-0 rounded-[7px] px-3 py-2 text-xs font-medium transition ${activeStatus === status ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {orderStatusLabel(status)} ({counts[status] ?? 0})
            </button>
          ))}
        </div>

        <div className="grid flex-1 gap-3 xl:grid-cols-2">
          {visibleOrders.length ? visibleOrders.map((order) => {
            const Icon = orderIcon(order.status);
            const actionLabel = statusActionLabel(order);
            const date = new Date(order.createdAt);

            return (
              <article key={order.id} className="rounded-[7px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[7px] bg-slate-950 text-white">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold tracking-tight">{order.code}</h2>
                        <span className={`rounded-[6px] px-2 py-1 text-[11px] font-medium ring-1 ${statusTone[order.status]}`}>
                          {orderStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800">{order.customerName}</p>
                      <p className="text-xs text-slate-500">{order.customerPhone} · {fulfillmentLabel(order.fulfillmentMethod)} · {date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatPublicMoney(order.total, order.currency)}</p>
                    <p className="text-xs text-slate-500">{order.paymentMethod}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-[7px] bg-slate-50 p-3">
                  <div className="space-y-1.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-slate-700">{item.quantity}x {item.name}</span>
                        <span className="font-medium">{formatPublicMoney(item.subtotal, order.currency)}</span>
                      </div>
                    ))}
                  </div>
                  {order.address ? <p className="mt-3 text-xs text-slate-500">{order.address}{order.addressReference ? ` · ${order.addressReference}` : ""}</p> : null}
                  {order.notes ? <p className="mt-1 text-xs text-slate-500">Nota: {order.notes}</p> : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <a href={whatsappUrl(order, order.status, businessName)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                    <MessageCircle className="size-3.5" />
                    WhatsApp
                  </a>
                  <div className="flex flex-wrap gap-2">
                    {order.status !== "CANCELLED" && order.status !== "DELIVERED" ? (
                      <Button type="button" variant="outline" className="h-9 rounded-[7px] px-3 text-xs" disabled={isPending && pendingId === order.id} onClick={() => updateStatus(order.id, "CANCELLED")}>
                        Cancelar
                      </Button>
                    ) : null}
                    {actionLabel ? (
                      <Button type="button" className="h-9 rounded-[7px] bg-slate-950 px-3 text-xs text-white hover:bg-slate-800" disabled={isPending && pendingId === order.id} onClick={() => handlePrimaryAction(order)}>
                        {isPending && pendingId === order.id ? "Guardando..." : actionLabel}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-[7px] border border-dashed border-slate-300 bg-white p-10 text-center">
              <MoreHorizontal className="mx-auto size-7 text-slate-400" />
              <p className="mt-2 text-sm font-medium">No hay pedidos en este estado</p>
              <p className="mt-1 text-sm text-slate-500">Los pedidos de la Tienda Online aparecerán aquí.</p>
            </div>
          )}
        </div>
      </section>

      {preparingOrder ? (
        <section className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/50">Preparación</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{preparingOrder.code}</h2>
              <p className="text-sm text-white/60">{preparingOrder.customerName} · {fulfillmentLabel(preparingOrder.fulfillmentMethod)} · {preparingOrder.paymentMethod}</p>
            </div>
            <button type="button" onClick={() => setPreparingOrder(null)} className="flex size-10 items-center justify-center rounded-[7px] border border-white/10 bg-white/5">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_360px]">
            <div className="overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-3">
                {preparingOrder.items.map((item) => {
                  const checked = Boolean(checkedItems[item.id]);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCheckedItems((current) => ({ ...current, [item.id]: !checked }))}
                      className={`flex items-center justify-between gap-4 rounded-[7px] border p-4 text-left transition ${checked ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 bg-white/5 hover:bg-white/8"}`}
                    >
                      <span>
                        <span className="block text-lg font-semibold">{item.name}</span>
                        <span className="text-sm text-white/50">Sin imagen · marcar al preparar</span>
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="text-3xl font-semibold">x{item.quantity}</span>
                        <span className={`flex size-10 items-center justify-center rounded-[7px] ${checked ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-white/50"}`}>
                          {checked ? <Check className="size-5" /> : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {preparingOrder.notes ? <p className="mt-4 rounded-[7px] border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">Nota: {preparingOrder.notes}</p> : null}
            </div>

            <aside className="border-t border-white/10 p-4 sm:p-6 lg:border-l lg:border-t-0">
              <div className="rounded-[7px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">Cliente</p>
                <p className="mt-2 text-sm text-white/70">{preparingOrder.customerName}</p>
                <p className="text-sm text-white/50">{preparingOrder.customerPhone}</p>
                {preparingOrder.address ? <p className="mt-2 text-sm text-white/50">{preparingOrder.address}</p> : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] as PublicOrderStatus[]).map((status) => (
                  <a key={status} href={whatsappUrl(preparingOrder, status, businessName)} target="_blank" rel="noreferrer" className="rounded-[7px] border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-medium text-white/80 hover:bg-white/10">
                    {orderStatusLabel(status)}
                  </a>
                ))}
              </div>
              <Button
                type="button"
                disabled={!allPrepared || (isPending && pendingId === preparingOrder.id)}
                onClick={() => updateStatus(preparingOrder.id, "READY", () => setPreparingOrder(null))}
                className="mt-4 h-12 w-full rounded-[7px] bg-emerald-500 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
              >
                <CheckCircle2 className="mr-2 size-4" />
                Pedido listo
              </Button>
            </aside>
          </div>
        </section>
      ) : null}
    </main>
  );
}
