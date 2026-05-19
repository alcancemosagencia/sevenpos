import type { CartItem } from "@/features/pos/types";

const keyPrefix = "sevenpos:cart:";

export function cartStorageKey(businessId: string) {
  return `${keyPrefix}${businessId}`;
}

export function loadCart(businessId: string): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(cartStorageKey(businessId));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(businessId: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(cartStorageKey(businessId), JSON.stringify(items));
}
