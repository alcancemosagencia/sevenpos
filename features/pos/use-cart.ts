"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCart, saveCart } from "@/features/pos/cart-storage";
import type { CartItem, PosProduct } from "@/features/pos/types";

export function useCart(
  businessId: string,
  exchangeRate: number,
  options?: {
    taxesEnabled?: boolean;
    taxRate?: number;
    tipsEnabled?: boolean;
    tipRate?: number;
    tipMode?: string;
  },
) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCart(businessId));
    setHydrated(true);
  }, [businessId]);

  useEffect(() => {
    if (hydrated) {
      saveCart(businessId, items);
    }
  }, [businessId, hydrated, items]);

  const addItem = useCallback((product: PosProduct, quantity = 1) => {
    if (product.stock <= 0) return;
    const nextQuantity = Math.max(0.001, quantity);
    setSelectedProductId(product.id);

    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.stock, item.quantity + nextQuantity) }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          sku: product.sku,
          barcode: product.barcode,
          quantity: Math.min(product.stock, nextQuantity),
          unitPriceUsd: product.priceUsd,
          unitPriceBs: product.priceBs,
          stock: product.stock,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
    setSelectedProductId((current) => (current === productId ? null : current));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setSelectedProductId(productId);
    setItems((current) =>
      current.flatMap((item) => {
        if (item.productId !== productId) return item;
        if (quantity <= 0) return [];
        return { ...item, quantity: Math.min(item.stock, quantity) };
      }),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setSelectedProductId(null);
  }, []);

  const incrementSelected = useCallback(() => {
    if (!selectedProductId) return;
    setItems((current) =>
      current.map((item) =>
        item.productId === selectedProductId
          ? { ...item, quantity: Math.min(item.stock, item.quantity + 1) }
          : item,
      ),
    );
  }, [selectedProductId]);

  const decrementSelected = useCallback(() => {
    if (!selectedProductId) return;
    setItems((current) =>
      current.flatMap((item) => {
        if (item.productId !== selectedProductId) return item;
        if (item.quantity <= 1) return [];
        return { ...item, quantity: item.quantity - 1 };
      }),
    );
  }, [selectedProductId]);

  const totals = useMemo(() => {
    const subtotalUsd = items.reduce((sum, item) => sum + item.unitPriceUsd * item.quantity, 0);
    const taxUsd = options?.taxesEnabled ? subtotalUsd * ((options.taxRate ?? 0) / 100) : 0;
    const tipUsd = options?.tipsEnabled && options.tipMode === "AUTO" ? subtotalUsd * ((options.tipRate ?? 0) / 100) : 0;
    const totalUsd = subtotalUsd + taxUsd + tipUsd;
    const subtotalBs = subtotalUsd * exchangeRate;
    const taxBs = taxUsd * exchangeRate;
    const tipBs = tipUsd * exchangeRate;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotalUsd,
      subtotalBs,
      taxUsd,
      taxBs,
      tipUsd,
      tipBs,
      totalUsd,
      totalBs: totalUsd * exchangeRate,
      totalItems,
    };
  }, [exchangeRate, items, options?.taxRate, options?.taxesEnabled, options?.tipMode, options?.tipRate, options?.tipsEnabled]);

  return useMemo(() => ({
    items,
    selectedProductId,
    setSelectedProductId,
    addItem,
    removeItem,
    updateQuantity,
    incrementSelected,
    decrementSelected,
    clearCart,
    ...totals,
  }), [
    addItem,
    clearCart,
    decrementSelected,
    incrementSelected,
    items,
    removeItem,
    selectedProductId,
    totals,
    updateQuantity,
  ]);
}
