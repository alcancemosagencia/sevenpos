"use client";

import type { PaymentMethod } from "@/features/pos/types";

const DB_NAME = "sevenpos-offline-v1";
const DB_VERSION = 1;

export type OfflineSale = {
  id: string;
  businessId: string;
  cashSessionId: string;
  branchName: string;
  cashierName: string;
  paymentMethod: PaymentMethod;
  currency: "USD" | "BS";
  cashReceivedUsd?: number;
  cashReceivedBs?: number;
  preSaleId?: string | null;
  createdAt: string;
  status: "pending" | "syncing" | "conflict";
  error?: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPriceUsd: number }>;
};

export type OfflinePreSale = {
  id: string;
  tempCode: string;
  branchName: string;
  notes: string;
  createdAt: string;
  status: "pending" | "syncing" | "conflict";
  error?: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPriceUsd: number }>;
};

type StoreName = "sales" | "presales";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("sales")) db.createObjectStore("sales", { keyPath: "id" });
      if (!db.objectStoreNames.contains("presales")) db.createObjectStore("presales", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: StoreName, value: T) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new Event("sevenpos:offline-queue-changed"));
}

async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDb();
  const values = await new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return values;
}

async function remove(storeName: StoreName, id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new Event("sevenpos:offline-queue-changed"));
}

export const offlineStore = {
  addSale: (sale: OfflineSale) => put("sales", sale),
  addPreSale: (preSale: OfflinePreSale) => put("presales", preSale),
  getSales: () => getAll<OfflineSale>("sales"),
  getPreSales: () => getAll<OfflinePreSale>("presales"),
  updateSale: (sale: OfflineSale) => put("sales", sale),
  updatePreSale: (preSale: OfflinePreSale) => put("presales", preSale),
  removeSale: (id: string) => remove("sales", id),
  removePreSale: (id: string) => remove("presales", id),
};

export function createOfflineId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
