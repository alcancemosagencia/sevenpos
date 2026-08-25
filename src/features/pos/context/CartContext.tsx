import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Product } from '../../../domain/catalog/Product';
import { ProductPresentation } from '../../../domain/catalog/ProductPresentation';
import { BaseUnitCode } from '../../../domain/common/unit/BaseUnit';
import {
  calculateGrossLineTotal,
  distributeDiscountHareNiemeyer,
  calculateGlobalDiscountTotal,
  GlobalDiscountType,
  GlobalDiscountInput,
} from '../../../domain/common/money/MoneyMath';
import { QUANTITY_SCALE, toScaledQuantity } from '../../../domain/common/quantity/Quantity';
import { generateUuid } from '../../../domain/common/IdGenerator';
import { useAuth } from '../../../context/AuthContext';
import { logger } from '../../../infrastructure/logging/Logger';

const CART_SCHEMA_VERSION = 1;

export interface CartLine {
  lineId: string;
  productId: string;
  presentationId: string | null;
  productName: string;
  presentationName: string | null;
  displayName: string;
  baseUnit: BaseUnitCode;
  unitFactor: number;
  unitPrice: number; // Minor currency integer
  quantity: number; // Scaled integer (scale: 1000)
  grossLineTotal: number; // Minor currency integer
  discountTotal: number; // Minor currency integer
  lineTotal: number; // Minor currency integer
  availableStock?: number; // Scaled integer
  sku?: string | null;
  barcode?: string | null;
  imagePath?: string | null;
}

export type { GlobalDiscountType, GlobalDiscountInput };

export interface CartState {
  schemaVersion: number;
  businessId: string;
  userId: string;
  items: CartLine[];
  globalDiscount: GlobalDiscountInput | null;
  note: string;
  customerId: string | null;
  customerName: string;
  savedAt: string;
}

interface CartContextType {
  items: CartLine[];
  subtotal: number;
  globalDiscount: GlobalDiscountInput | null;
  discountTotal: number;
  total: number;
  itemCount: number;
  note: string;
  customerId: string | null;
  customerName: string;
  addItem: (product: Product, presentation?: ProductPresentation | null, quantityMajor?: number, availableStock?: number) => void;
  updateQuantity: (lineId: string, quantityScaled: number) => void;
  incrementQuantity: (lineId: string) => void;
  decrementQuantity: (lineId: string) => void;
  removeItem: (lineId: string) => void;
  setGlobalDiscount: (discount: GlobalDiscountInput | null) => void;
  setCustomer: (customerId: string | null, customerName: string) => void;
  setNote: (note: string) => void;
  clearCart: () => void;
  updatePricesFromConflict: (updatedPrices: { productId: string; presentationId?: string | null; officialUnitPrice: number }[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getCartStorageKey(businessId: string, userId: string): string {
  return `sevenpos_cart:${businessId || 'default'}:${userId || 'default'}`;
}

export const CartProvider: React.FC<{ children: React.ReactNode; businessId?: string; userId?: string }> = ({
  children,
  businessId = 'primary-business',
  userId = 'primary-user',
}) => {
  const { sessionStatus } = useAuth();
  const storageKey = getCartStorageKey(businessId, userId);

  const [items, setItems] = useState<CartLine[]>(() => {
    if (typeof sessionStorage === 'undefined') return [];
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed.schemaVersion === CART_SCHEMA_VERSION && parsed.businessId === businessId && Array.isArray(parsed.items)) {
          return parsed.items;
        }
      }
    } catch {
      // Ignore corrupt storage
    }
    return [];
  });

  const [globalDiscount, setGlobalDiscountState] = useState<GlobalDiscountInput | null>(() => {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed.schemaVersion === CART_SCHEMA_VERSION && parsed.globalDiscount) {
          return parsed.globalDiscount;
        }
      }
    } catch {
      // Ignore parse error in dev/SSR
    }
    return null;
  });

  const [note, setNoteState] = useState<string>(() => {
    if (typeof sessionStorage === 'undefined') return '';
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        return parsed.note || '';
      }
    } catch {
      // Ignore parse error in dev/SSR
    }
    return '';
  });

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('Consumidor final');

  // Auto-clear cart on session logout
  useEffect(() => {
    if (sessionStatus === 'locked' && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Ignore storage error
      }
    }
  }, [sessionStatus, storageKey]);

  // Persist to sessionStorage on state change
  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    try {
      if (items.length === 0 && !globalDiscount && !note) {
        sessionStorage.removeItem(storageKey);
        return;
      }
      const stateToSave: CartState = {
        schemaVersion: CART_SCHEMA_VERSION,
        businessId,
        userId,
        items,
        globalDiscount,
        note,
        customerId,
        customerName,
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (err) {
      logger.warn('CartContext', 'Error saving cart to sessionStorage', { error: String(err) });
    }
  }, [items, globalDiscount, note, customerId, customerName, storageKey, businessId, userId]);

  // Subtotal & Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.grossLineTotal, 0);
  }, [items]);

  const calculatedDiscountTotal = useMemo(() => {
    return calculateGlobalDiscountTotal(subtotal, globalDiscount);
  }, [globalDiscount, subtotal]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - calculatedDiscountTotal);
  }, [subtotal, calculatedDiscountTotal]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity / QUANTITY_SCALE), 0);
  }, [items]);

  // Re-distribute line discounts and calculate lineTotals whenever items or discount changes
  const computedItems = useMemo(() => {
    if (items.length === 0) return [];
    if (calculatedDiscountTotal <= 0) {
      return items.map((i) => ({
        ...i,
        discountTotal: 0,
        lineTotal: i.grossLineTotal,
      }));
    }

    const discountable = items.map((i) => ({ id: i.lineId, grossTotal: i.grossLineTotal }));
    const distributed = distributeDiscountHareNiemeyer(discountable, calculatedDiscountTotal);

    return items.map((i) => {
      const lineDisc = distributed.get(i.lineId) || 0;
      return {
        ...i,
        discountTotal: lineDisc,
        lineTotal: Math.max(0, i.grossLineTotal - lineDisc),
      };
    });
  }, [items, calculatedDiscountTotal]);

  const addItem = useCallback(
    (product: Product, presentation?: ProductPresentation | null, quantityMajor = 1, availableStock?: number) => {
      setItems((prev) => {
        const presentationId = presentation?.id || null;
        const unitFactor = presentation ? presentation.unitFactor : 1;
        const unitPrice = presentation ? presentation.salePrice : product.salePrice;
        const qtyScaledToAdd = toScaledQuantity(quantityMajor);

        // Merge line invariant: Same product + same presentation + same unit price
        const existingIdx = prev.findIndex(
          (i) => i.productId === product.id && i.presentationId === presentationId && i.unitPrice === unitPrice
        );

        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const nextQty = existing.quantity + qtyScaledToAdd;
          const nextGross = calculateGrossLineTotal(nextQty, unitPrice);

          const updated = [...prev];
          updated[existingIdx] = {
            ...existing,
            quantity: nextQty,
            grossLineTotal: nextGross,
            lineTotal: nextGross, // will be recalculated by computedItems
            availableStock: availableStock !== undefined ? availableStock : existing.availableStock,
          };
          return updated;
        }

        const displayName = presentation ? `${product.name} · ${presentation.name}` : product.name;
        const grossLineTotal = calculateGrossLineTotal(qtyScaledToAdd, unitPrice);

        const newLine: CartLine = {
          lineId: generateUuid(),
          productId: product.id,
          presentationId,
          productName: product.name,
          presentationName: presentation?.name || null,
          displayName,
          baseUnit: product.baseUnit,
          unitFactor,
          unitPrice,
          quantity: qtyScaledToAdd,
          grossLineTotal,
          discountTotal: 0,
          lineTotal: grossLineTotal,
          availableStock,
          sku: presentation?.sku || product.sku || null,
          barcode: presentation?.barcode || product.barcode || null,
          imagePath: presentation?.imagePath || product.imagePath || null,
        };

        return [...prev, newLine];
      });
    },
    []
  );

  const updateQuantity = useCallback((lineId: string, quantityScaled: number) => {
    setItems((prev) => {
      if (quantityScaled <= 0) {
        return prev.filter((i) => i.lineId !== lineId);
      }
      return prev.map((item) => {
        if (item.lineId !== lineId) return item;
        const gross = calculateGrossLineTotal(quantityScaled, item.unitPrice);
        return {
          ...item,
          quantity: quantityScaled,
          grossLineTotal: gross,
          lineTotal: gross,
        };
      });
    });
  }, []);

  const incrementQuantity = useCallback((lineId: string) => {
    setItems((prev) => {
      return prev.map((item) => {
        if (item.lineId !== lineId) return item;
        const step = item.baseUnit === 'UNIT' ? QUANTITY_SCALE : toScaledQuantity(1);
        const nextQty = item.quantity + step;
        const gross = calculateGrossLineTotal(nextQty, item.unitPrice);
        return {
          ...item,
          quantity: nextQty,
          grossLineTotal: gross,
          lineTotal: gross,
        };
      });
    });
  }, []);

  const decrementQuantity = useCallback((lineId: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.lineId === lineId);
      if (!target) return prev;
      const step = target.baseUnit === 'UNIT' ? QUANTITY_SCALE : toScaledQuantity(1);
      const nextQty = target.quantity - step;
      if (nextQty <= 0) {
        return prev.filter((i) => i.lineId !== lineId);
      }
      return prev.map((item) => {
        if (item.lineId !== lineId) return item;
        const gross = calculateGrossLineTotal(nextQty, item.unitPrice);
        return {
          ...item,
          quantity: nextQty,
          grossLineTotal: gross,
          lineTotal: gross,
        };
      });
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const setGlobalDiscount = useCallback((discount: GlobalDiscountInput | null) => {
    if (!discount || discount.value <= 0) {
      setGlobalDiscountState(null);
      return;
    }
    setGlobalDiscountState({
      type: discount.type,
      value: discount.value,
    });
  }, []);

  const setCustomer = useCallback((custId: string | null, name: string) => {
    setCustomerId(custId);
    setCustomerName(name || 'Consumidor final');
  }, []);

  const setNote = useCallback((n: string) => {
    setNoteState(n || '');
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setGlobalDiscountState(null);
    setNoteState('');
    setCustomerId(null);
    setCustomerName('Consumidor final');
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Ignore storage error
      }
    }
  }, [storageKey]);

  const updatePricesFromConflict = useCallback(
    (updatedPrices: { productId: string; presentationId?: string | null; officialUnitPrice: number }[]) => {
      setItems((prev) => {
        return prev.map((item) => {
          const match = updatedPrices.find(
            (u) => u.productId === item.productId && (u.presentationId || null) === (item.presentationId || null)
          );
          if (match) {
            const newUnitPrice = match.officialUnitPrice;
            const newGross = calculateGrossLineTotal(item.quantity, newUnitPrice);
            return {
              ...item,
              unitPrice: newUnitPrice,
              grossLineTotal: newGross,
              lineTotal: newGross,
            };
          }
          return item;
        });
      });
    },
    []
  );

  return (
    <CartContext.Provider
      value={{
        items: computedItems,
        subtotal,
        globalDiscount,
        discountTotal: calculatedDiscountTotal,
        total,
        itemCount,
        note,
        customerId,
        customerName,
        addItem,
        updateQuantity,
        incrementQuantity,
        decrementQuantity,
        removeItem,
        setGlobalDiscount,
        setCustomer,
        setNote,
        clearCart,
        updatePricesFromConflict,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    logger.warn('CartContext', 'useCart called outside CartProvider, returning empty fallback state');
    return {
      items: [],
      subtotal: 0,
      globalDiscount: null,
      discountTotal: 0,
      total: 0,
      itemCount: 0,
      note: '',
      customerId: null,
      customerName: 'Consumidor final',
      addItem: () => {},
      updateQuantity: () => {},
      incrementQuantity: () => {},
      decrementQuantity: () => {},
      removeItem: () => {},
      setGlobalDiscount: () => {},
      setCustomer: () => {},
      setNote: () => {},
      clearCart: () => {},
      updatePricesFromConflict: () => {},
    };
  }
  return context;
};
