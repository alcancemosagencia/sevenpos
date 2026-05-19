"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCart, saveCart } from "@/features/pos/cart-storage";
import type { CartItem, PosProduct } from "@/features/pos/types";

export function useCart(businessId: string, exchangeRate: number) {
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
    const subtotalBs = subtotalUsd * exchangeRate;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotalUsd,
      subtotalBs,
      totalUsd: subtotalUsd,
      totalBs: subtotalBs,
      totalItems,
    };
  }, [exchangeRate, items]);

  return {
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
  };
}
