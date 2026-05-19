"use client";

import { useRef, useState, type TouchEvent } from "react";
import { ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartPanel } from "@/features/pos/cart-panel";
import { money } from "@/features/pos/format";
import type { CartItem, TenderMode } from "@/features/pos/types";

export function MobileCartSheet({
  open,
  items,
  tenderMode,
  loading,
  totalItems,
  subtotalUsd,
  taxUsd,
  tipUsd,
  totalUsd,
  totalBs,
  exchangeRate,
  paidUsd,
  paidBs,
  selectedProductId,
  onOpenChange,
  onTenderModeChange,
  onPaidUsdChange,
  onPaidBsChange,
  onSelectItem,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: {
  open: boolean;
  items: CartItem[];
  tenderMode: TenderMode;
  loading: boolean;
  totalItems: number;
  subtotalUsd?: number;
  taxUsd?: number;
  tipUsd?: number;
  totalUsd: number;
  totalBs: number;
  exchangeRate: number;
  paidUsd: string;
  paidBs: string;
  selectedProductId: string | null;
  onOpenChange: (open: boolean) => void;
  onTenderModeChange: (method: TenderMode) => void;
  onPaidUsdChange: (value: string) => void;
  onPaidBsChange: (value: string) => void;
  onSelectItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}) {
  const startY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    startY.current = event.touches[0]?.clientY ?? 0;
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const currentY = event.touches[0]?.clientY ?? 0;
    setDragOffset(Math.max(0, currentY - startY.current));
  }

  function handleTouchEnd() {
    if (dragOffset > 86) {
      onOpenChange(false);
    }
    setDragOffset(0);
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 px-3 lg:hidden">
        <Button
          className="h-[58px] w-full justify-between rounded-lg bg-primary px-5 text-[15px] font-semibold shadow-[0_14px_32px_hsl(218_92%_35%/0.26)] active:scale-[0.99]"
          onClick={() => onOpenChange(true)}
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="size-4" />
            <span>
              <span className="block leading-none">Ver carrito</span>
              <span className="mt-1 block text-xs font-medium opacity-90">{totalItems} productos</span>
            </span>
          </span>
          <span className="text-right">
            <span className="block">{money(totalUsd, "USD")}</span>
            <span className="block text-xs opacity-90">Bs {totalBs.toFixed(2)}</span>
          </span>
        </Button>
      </div>

      {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Cerrar carrito"
              className="absolute inset-0 bg-foreground/28 backdrop-blur-[3px]"
              onClick={() => onOpenChange(false)}
            />
            <div
              className="absolute inset-x-0 bottom-0 flex h-[88dvh] max-h-[720px] flex-col overflow-hidden rounded-t-lg bg-card shadow-[0_-24px_60px_hsl(220_20%_10%/0.22)] animate-in slide-in-from-bottom-6 duration-200 [transition-timing-function:cubic-bezier(.2,.85,.3,1.08)]"
              style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined }}
            >
              <div
                className="shrink-0 touch-none border-b bg-card/96 px-4 pb-2.5 pt-2 backdrop-blur-xl"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/28" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold">Checkout</p>
                    <p className="text-xs font-medium text-muted-foreground">{totalItems} items en carrito</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                    aria-label="Cerrar"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <CartPanel
                  items={items}
                  tenderMode={tenderMode}
                  loading={loading}
                  totalItems={totalItems}
                  subtotalUsd={subtotalUsd}
                  taxUsd={taxUsd}
                  tipUsd={tipUsd}
                  totalUsd={totalUsd}
                  totalBs={totalBs}
                  exchangeRate={exchangeRate}
                  paidUsd={paidUsd}
                  paidBs={paidBs}
                  selectedProductId={selectedProductId}
                  onTenderModeChange={onTenderModeChange}
                  onPaidUsdChange={onPaidUsdChange}
                  onPaidBsChange={onPaidBsChange}
                  onSelectItem={onSelectItem}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemove}
                  onCheckout={onCheckout}
                />
              </div>
            </div>
          </div>
        ) : null}
    </>
  );
}
