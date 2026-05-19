"use client";

import { CreditCard, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/features/pos/format";
import type { CartItem, TenderMode } from "@/features/pos/types";

const paymentMethods: Array<{ value: TenderMode; label: string; currency: "USD" | "BS" | "MIXED" }> = [
  { value: "CASH_USD", label: "Efectivo USD", currency: "USD" },
  { value: "CASH_BS", label: "Efectivo Bs", currency: "BS" },
  { value: "MIXED", label: "Pago mixto", currency: "MIXED" },
  { value: "MOBILE_PAYMENT", label: "Pago móvil", currency: "BS" },
  { value: "BANK_TRANSFER", label: "Transferencia", currency: "USD" },
];

export function CartPanel({
  items,
  tenderMode,
  loading,
  totalItems,
  totalUsd,
  totalBs,
  exchangeRate,
  paidUsd,
  paidBs,
  selectedProductId,
  onTenderModeChange,
  onPaidUsdChange,
  onPaidBsChange,
  onSelectItem,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: {
  items: CartItem[];
  tenderMode: TenderMode;
  loading: boolean;
  totalItems: number;
  totalUsd: number;
  totalBs: number;
  exchangeRate: number;
  paidUsd: string;
  paidBs: string;
  selectedProductId: string | null;
  onTenderModeChange: (method: TenderMode) => void;
  onPaidUsdChange: (value: string) => void;
  onPaidBsChange: (value: string) => void;
  onSelectItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}) {
  const selected = paymentMethods.find((method) => method.value === tenderMode) ?? paymentMethods[0];
  const paidUsdNumber = Number(paidUsd || 0);
  const paidBsNumber = Number(paidBs || 0);
  const paidEquivalentUsd = paidUsdNumber + paidBsNumber / exchangeRate;
  const remainingUsd = Math.max(0, totalUsd - paidEquivalentUsd);
  const remainingBs = remainingUsd * exchangeRate;
  const cashUsdReceived = paidUsdNumber > 0 ? paidUsdNumber : totalUsd;
  const cashBsReceived = paidBsNumber > 0 ? paidBsNumber : totalBs;
  const cashUsdChange = Math.max(0, cashUsdReceived - totalUsd);
  const cashBsChange = Math.max(0, cashBsReceived - totalBs);
  const checkoutLabel =
    selected.currency === "BS"
      ? `Cobrar Bs ${totalBs.toFixed(2)}`
      : selected.currency === "MIXED"
        ? "Completar venta"
        : `Cobrar ${money(totalUsd, "USD")}`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Carrito</h2>
          <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            {totalItems}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 [-webkit-overflow-scrolling:touch]">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <CreditCard className="size-5" />
            </div>
            <p className="text-sm font-semibold">Carrito vacio</p>
            <p className="mt-1 text-xs text-muted-foreground">Toca productos para vender.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.productId}
              onClick={() => onSelectItem(item.productId)}
              className={`rounded-lg border bg-background p-3 shadow-[0_2px_8px_hsl(220_20%_10%/0.035)] transition ${
                selectedProductId === item.productId ? "border-primary ring-2 ring-primary/10" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {money(item.unitPriceUsd, "USD")} - Bs {(item.unitPriceUsd * exchangeRate).toFixed(2)} c/u
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.productId)}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Quitar producto"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    className="flex size-9 items-center justify-center rounded-lg bg-muted active:scale-95"
                    aria-label="Restar"
                  >
                    <Minus className="size-4" />
                  </button>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={(event) => onUpdateQuantity(item.productId, Number(event.target.value))}
                    onFocus={() => onSelectItem(item.productId)}
                    className="h-9 w-11 rounded-lg border bg-card text-center text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                    inputMode="decimal"
                    max={item.stock}
                    aria-label="Cantidad"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    className="flex size-9 items-center justify-center rounded-lg bg-muted active:scale-95"
                    aria-label="Sumar"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{money(item.unitPriceUsd * item.quantity, "USD")}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Bs {(item.unitPriceUsd * item.quantity * exchangeRate).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t bg-card p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:p-4">
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          {paymentMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => onTenderModeChange(method.value)}
              className={`min-h-10 rounded-lg border px-3 py-2 text-left text-xs font-medium transition active:scale-[0.98] ${
                tenderMode === method.value
                  ? "border-primary bg-accent text-accent-foreground shadow-[0_6px_16px_hsl(218_92%_35%/0.12)]"
                  : "bg-background text-muted-foreground"
              }`}
            >
              {method.label}
            </button>
          ))}
        </div>

        {selected.currency === "MIXED" ? (
          <div className="mb-3 rounded-lg border bg-background p-2.5">
            <p className="mb-2 text-xs font-semibold">Pago mixto</p>
            <div className="grid grid-cols-2 gap-2">
              <Input value={paidUsd} onChange={(event) => onPaidUsdChange(event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" placeholder="USD" className="h-10" />
              <Input value={paidBs} onChange={(event) => onPaidBsChange(event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" placeholder="Bs" className="h-10" />
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Restante</span>
              <span className="font-semibold">{money(remainingUsd, "USD")} - Bs {remainingBs.toFixed(2)}</span>
            </div>
          </div>
        ) : null}

        {selected.value === "CASH_USD" ? (
          <div className="mb-3 rounded-lg border bg-background p-2.5">
            <p className="mb-2 text-xs font-semibold">Efectivo recibido</p>
            <Input
              value={paidUsd}
              onChange={(event) => onPaidUsdChange(event.target.value)}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              placeholder={money(totalUsd, "USD")}
              className="h-10"
            />
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Vuelto</span>
              <span className="font-semibold">{money(cashUsdChange, "USD")}</span>
            </div>
          </div>
        ) : null}

        {selected.value === "CASH_BS" ? (
          <div className="mb-3 rounded-lg border bg-background p-2.5">
            <p className="mb-2 text-xs font-semibold">Efectivo recibido</p>
            <Input
              value={paidBs}
              onChange={(event) => onPaidBsChange(event.target.value)}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              placeholder={`Bs ${totalBs.toFixed(2)}`}
              className="h-10"
            />
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Vuelto</span>
              <span className="font-semibold">Bs {cashBsChange.toFixed(2)}</span>
            </div>
          </div>
        ) : null}

        <div className="mb-3 space-y-1 border-t pt-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal USD</span>
            <span className="font-semibold">{money(totalUsd, "USD")}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal Bs</span>
            <span className="font-semibold">Bs {totalBs.toFixed(2)}</span>
          </div>
          <div className="flex items-end justify-between pt-2">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-right">
              <span className="block text-2xl font-medium tracking-normal">{money(totalUsd, "USD")}</span>
              <span className="block text-sm font-semibold text-muted-foreground">Bs {totalBs.toFixed(2)}</span>
            </span>
          </div>
        </div>

        <Button className="h-12 w-full shadow-[0_12px_28px_hsl(218_92%_35%/0.22)]" disabled={items.length === 0 || loading} onClick={onCheckout}>
          {loading ? "Procesando..." : checkoutLabel}
        </Button>
      </div>
    </div>
  );
}

