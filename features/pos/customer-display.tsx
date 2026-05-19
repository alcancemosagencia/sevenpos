"use client";

import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { loadCart } from "@/features/pos/cart-storage";
import { money } from "@/features/pos/format";
import type { CartItem } from "@/features/pos/types";

export function CustomerDisplay({
  businessId,
  businessName,
  exchangeRate,
}: {
  businessId: string;
  businessName: string;
  exchangeRate: number;
}) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    function refreshCart() {
      setItems(loadCart(businessId));
    }

    refreshCart();
    const interval = window.setInterval(refreshCart, 650);
    window.addEventListener("storage", refreshCart);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", refreshCart);
    };
  }, [businessId]);

  const totals = useMemo(() => {
    const totalUsd = items.reduce((sum, item) => sum + item.unitPriceUsd * item.quantity, 0);
    return {
      totalUsd,
      totalBs: totalUsd * exchangeRate,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [exchangeRate, items]);

  return (
    <main className="flex h-[100dvh] flex-col bg-background p-4 text-foreground sm:p-6">
      <header className="flex shrink-0 items-center justify-between rounded-lg border bg-card px-4 py-3 shadow-[0_8px_24px_hsl(220_20%_10%/0.06)]">
        <div>
          <p className="text-sm font-semibold">SevenPOS</p>
          <h1 className="text-lg font-semibold">{businessName}</h1>
        </div>
        <div className="rounded-lg bg-accent px-3 py-2 text-right text-accent-foreground">
          <p className="text-[10px] font-medium uppercase">Tasa</p>
          <p className="text-sm font-semibold">1 USD = {exchangeRate.toFixed(2)} Bs</p>
        </div>
      </header>

      <section className="mt-4 min-h-0 flex-1 overflow-hidden rounded-lg border bg-card shadow-[0_10px_30px_hsl(220_20%_10%/0.08)]">
        {items.length > 0 ? (
          <div className="h-full overflow-y-auto p-3">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} x {money(item.unitPriceUsd, "USD")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold">{money(item.unitPriceUsd * item.quantity, "USD")}</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Bs {(item.unitPriceUsd * item.quantity * exchangeRate).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ShoppingBag className="size-6" />
            </div>
            <p className="text-lg font-semibold">Esperando productos</p>
            <p className="text-sm text-muted-foreground">La compra aparecera aqui.</p>
          </div>
        )}
      </section>

      <footer className="mt-4 shrink-0 rounded-lg bg-primary p-4 text-primary-foreground shadow-[0_16px_38px_hsl(218_92%_35%/0.26)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium opacity-90">{totals.totalItems} productos</p>
            <p className="text-xs font-semibold opacity-80">Total a pagar</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold">{money(totals.totalUsd, "USD")}</p>
            <p className="text-sm font-medium opacity-90">Bs {totals.totalBs.toFixed(2)}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
