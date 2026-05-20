"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { offlineStore } from "@/features/pwa/offline-store";

type SyncState = "idle" | "syncing" | "error";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error ?? "No pudimos sincronizar.");
  }
  return data;
}

export function PwaRuntime() {
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [, setSyncState] = useState<SyncState>("idle");

  const refreshPending = useCallback(async () => {
    if (!("indexedDB" in window)) return;
    const [sales, preSales] = await Promise.all([offlineStore.getSales(), offlineStore.getPreSales()]);
    setConflicts(
      [
        ...sales.filter((sale) => sale.status === "conflict").map((sale) => sale.error ?? "Venta offline con conflicto"),
        ...preSales.filter((preSale) => preSale.status === "conflict").map((preSale) => preSale.error ?? "Preventa offline con conflicto"),
      ].slice(0, 3),
    );
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || !("indexedDB" in window)) return;
    const [sales, preSales] = await Promise.all([offlineStore.getSales(), offlineStore.getPreSales()]);
    if (sales.length + preSales.length === 0) {
      setSyncState("idle");
      return;
    }

    setSyncState("syncing");
    try {
      for (const sale of sales) {
        try {
          await offlineStore.updateSale({ ...sale, status: "syncing", error: undefined });
          await postJson("/api/sync/offline-sales", sale);
          await offlineStore.removeSale(sale.id);
        } catch (error) {
          await offlineStore.updateSale({ ...sale, status: "conflict", error: error instanceof Error ? error.message : "Conflicto al sincronizar" });
        }
      }

      for (const preSale of preSales) {
        try {
          await offlineStore.updatePreSale({ ...preSale, status: "syncing", error: undefined });
          await postJson("/api/sync/offline-presales", preSale);
          await offlineStore.removePreSale(preSale.id);
        } catch (error) {
          await offlineStore.updatePreSale({ ...preSale, status: "conflict", error: error instanceof Error ? error.message : "Conflicto al sincronizar" });
        }
      }
      setSyncState("idle");
      await refreshPending();
    } catch {
      setSyncState("error");
    }
  }, [refreshPending]);

  useEffect(() => {
    void refreshPending();

    let removeLoadListener: (() => void) | undefined;

    if ("serviceWorker" in navigator) {
      const registerServiceWorker = () => {
        void navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            void registration.update();
            registration.active?.postMessage({ type: "SEVENPOS_CLEAR_LEGACY_CACHES" });
          })
          .catch(() => undefined);
      };

      if (document.readyState === "complete") {
        registerServiceWorker();
      } else {
        window.addEventListener("load", registerServiceWorker, { once: true });
        removeLoadListener = () => window.removeEventListener("load", registerServiceWorker);
      }
    }

    function handleOnline() {
      void syncQueue();
    }
    function handleQueue() {
      void refreshPending();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("sevenpos:offline-queue-changed", handleQueue);
    void syncQueue();

    return () => {
      removeLoadListener?.();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("sevenpos:offline-queue-changed", handleQueue);
    };
  }, [refreshPending, syncQueue]);

  return (
    <>
      {conflicts.length > 0 ? (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-3 z-[90] max-w-[calc(100vw-1.5rem)] rounded-lg border border-destructive/25 bg-card/95 p-3 text-xs shadow-[0_18px_50px_hsl(220_20%_10%/0.2)] backdrop-blur-xl sm:max-w-sm">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="size-4" />
            Conflictos offline
          </div>
          <div className="mt-2 space-y-1 text-muted-foreground">
            {conflicts.map((conflict, index) => (
              <p key={`${conflict}-${index}`} className="line-clamp-2">{conflict}</p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void syncQueue()}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground"
          >
            <RefreshCw className="size-3.5" />
            Reintentar
          </button>
        </div>
      ) : null}
    </>
  );
}

export function NetworkStatusInline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-[11px] font-medium text-sidebar-accent-foreground">
      <span className={`size-2 rounded-full ${online ? "bg-success" : "bg-destructive"}`} />
      <span>{online ? "Sistema operativo" : "Modo offline"}</span>
    </div>
  );
}
