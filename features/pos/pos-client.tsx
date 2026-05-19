"use client";

import { useActionState, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, MinusCircle, Monitor, PackagePlus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PremiumModal } from "@/components/shared/premium-modal";
import { createQuickExpenseAction, type CashActionState } from "@/features/cash/actions";
import { checkoutAction } from "@/features/pos/actions";
import { CartPanel } from "@/features/pos/cart-panel";
import { money } from "@/features/pos/format";
import { MobileCartSheet } from "@/features/pos/mobile-cart-sheet";
import { ProductGrid } from "@/features/pos/product-grid";
import { useCart } from "@/features/pos/use-cart";
import type { PaymentMethod, PosPreSale, PosProduct, ProductCategory, TenderMode } from "@/features/pos/types";
import { createProductAction, type ProductActionState } from "@/features/products/actions";
import { AutoPrint, NewSaleButton, PrintReceiptButton } from "@/features/receipts/receipt-actions";
import { ReceiptTemplate } from "@/features/receipts/receipt-template";
import type { ReceiptData } from "@/features/receipts/types";
import { dispatchDrawerKick, dispatchKitchenPrint } from "@/features/hardware/escpos";
import type { HardwareSettings } from "@/features/hardware/settings";
import { createOfflineId, offlineStore } from "@/features/pwa/offline-store";

const expenseInitialState: CashActionState = {};
const productInitialState: ProductActionState = {};

type PosToast = {
  id: number;
  tone: "success" | "error" | "info";
  message: string;
};

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

const paymentLabels: Record<TenderMode, string> = {
  CASH_USD: "Efectivo USD",
  CASH_BS: "Efectivo Bs",
  MIXED: "Pago mixto",
  MOBILE_PAYMENT: "Pago móvil",
  BANK_TRANSFER: "Transferencia",
};

export function PosClient({
  businessId,
  businessName,
  businessPhone,
  businessEmail,
  exchangeRate,
  products,
  categories,
  preSales,
  cashSession,
  cashierName,
  branchName,
  hardwareSettings,
}: {
  businessId: string;
  businessName: string;
  businessPhone?: string | null;
  businessEmail?: string | null;
  exchangeRate: number;
  products: PosProduct[];
  categories: ProductCategory[];
  preSales: PosPreSale[];
  cashSession: {
    id: string;
    openedAt: string;
    openedBy: string;
    expectedUsd: number;
    expectedBs: number;
    expensesUsd: number;
    expensesBs: number;
  };
  cashierName: string;
  branchName: string;
  hardwareSettings: HardwareSettings;
}) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const scannerBufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const toastIdRef = useRef(0);
  const checkoutLockRef = useRef(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryId, setCategoryId] = useState("all");
  const [tenderMode, setTenderMode] = useState<TenderMode>("CASH_USD");
  const [paidUsd, setPaidUsd] = useState("");
  const [paidBs, setPaidBs] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [quickProductOpen, setQuickProductOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<PosToast[]>([]);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [activePreSaleId, setActivePreSaleId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [pendingOfflineSales, setPendingOfflineSales] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [expenseState, expenseAction, expensePending] = useActionState(createQuickExpenseAction, expenseInitialState);
  const [productState, productAction, productPending] = useActionState(createProductAction, productInitialState);
  const cart = useCart(businessId, exchangeRate);

  const showToast = useCallback((message: string, tone: PosToast["tone"] = "info") => {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 1800);
  }, []);

  const refreshOfflineSales = useCallback(async () => {
    if (!("indexedDB" in window)) return;
    const sales = await offlineStore.getSales();
    setPendingOfflineSales(sales.length);
  }, []);

  const playSound = useCallback((tone: "scan" | "success" | "error") => {
    try {
      const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = tone === "error" ? 180 : tone === "success" ? 620 : 520;
      gain.gain.value = 0.025;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + (tone === "error" ? 0.11 : 0.07));
      oscillator.onended = () => void context.close();
    } catch {
      // Audio feedback is optional and should never block checkout.
    }
  }, []);

  const filteredProducts = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatches = categoryId === "all" || product.categoryId === categoryId;
      if (!categoryMatches) return false;
      if (!normalized) return true;

      return [product.name, product.sku, product.barcode]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [categoryId, deferredSearch, products]);

  const checkoutCurrency = tenderMode === "CASH_BS" || tenderMode === "MOBILE_PAYMENT" ? "BS" : "USD";
  const checkoutPaymentMethod: PaymentMethod = tenderMode === "MIXED" ? "CASH_USD" : tenderMode;

  const buildReceipt = useCallback((saleId: string): ReceiptData => {
    const receivedUsd =
      tenderMode === "CASH_USD"
        ? Number(paidUsd || cart.totalUsd)
        : tenderMode === "MIXED"
          ? Number(paidUsd || 0)
          : undefined;
    const receivedBs =
      tenderMode === "CASH_BS"
        ? Number(paidBs || cart.totalBs)
        : tenderMode === "MIXED"
          ? Number(paidBs || 0)
          : undefined;
    const paidAsUsd = (receivedUsd ?? 0) + (receivedBs ?? 0) / exchangeRate;
    const changeUsd =
      tenderMode === "CASH_USD"
        ? Math.max(0, (receivedUsd ?? cart.totalUsd) - cart.totalUsd)
        : tenderMode === "MIXED"
          ? Math.max(0, paidAsUsd - cart.totalUsd)
          : 0;
    const changeBs =
      tenderMode === "CASH_BS"
        ? Math.max(0, (receivedBs ?? cart.totalBs) - cart.totalBs)
        : tenderMode === "MIXED"
          ? changeUsd * exchangeRate
          : 0;

    return {
      id: saleId,
      businessName,
      businessPhone,
      businessEmail,
      branchName,
      cashierName,
      createdAt: new Date().toISOString(),
      exchangeRate,
      subtotalUsd: cart.subtotalUsd,
      totalUsd: cart.totalUsd,
      totalBs: cart.totalBs,
      payment: {
        method: paymentLabels[tenderMode],
        receivedUsd,
        receivedBs,
        changeUsd,
        changeBs,
      },
      items: cart.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPriceUsd: item.unitPriceUsd,
        subtotalUsd: item.unitPriceUsd * item.quantity,
      })),
      footer: hardwareSettings.ticketFooter,
      logoUrl: hardwareSettings.ticketLogoUrl,
      qrValue: saleId,
    };
  }, [
    businessEmail,
    businessName,
    businessPhone,
    branchName,
    cashierName,
    cart.items,
    cart.subtotalUsd,
    cart.totalBs,
    cart.totalUsd,
    exchangeRate,
    paidBs,
    paidUsd,
    tenderMode,
    hardwareSettings.ticketFooter,
    hardwareSettings.ticketLogoUrl,
  ]);

  const addProductToCart = useCallback((product: PosProduct, source: "tap" | "scan" = "tap") => {
    if (product.stock <= 0) {
      showToast("Sin stock disponible", "error");
      playSound("error");
      return;
    }

    cart.addItem(product);
    showToast(source === "scan" ? `Barcode agregado: ${product.name}` : `${product.name} agregado`, "success");
    playSound("scan");
  }, [cart, playSound, showToast]);

  const loadPreSale = useCallback((preSale: PosPreSale) => {
    preSale.items.forEach((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (product) {
        cart.addItem(product, item.quantity);
      }
    });
    setActivePreSaleId(preSale.id);
    showToast(`Preventa ${preSale.code} cargada`, "success");
    playSound("success");
  }, [cart, playSound, products, showToast]);

  const findScannedProduct = useCallback((code: string) => {
    const normalized = code.trim().toLowerCase();
    if (!normalized) return null;

    return (
      products.find((product) => product.barcode?.trim().toLowerCase() === normalized) ??
      products.find((product) => product.sku?.trim().toLowerCase() === normalized) ??
      null
    );
  }, [products]);

  const handleScan = useCallback((code: string) => {
    const product = findScannedProduct(code);
    if (!product) {
      showToast("Producto no encontrado", "error");
      playSound("error");
      return;
    }

    addProductToCart(product, "scan");
  }, [addProductToCart, findScannedProduct, playSound, showToast]);

  const handleCheckout = useCallback(() => {
    if (cart.items.length === 0 || isPending || checkoutLockRef.current) {
      if (cart.items.length === 0) {
        showToast("Carrito vacio", "error");
        playSound("error");
      }
      return;
    }

    setMessage(null);
    checkoutLockRef.current = true;

    if (!navigator.onLine) {
      const offlineId = createOfflineId("sale");
      void offlineStore
        .addSale({
          id: offlineId,
          businessId,
          cashSessionId: cashSession.id,
          branchName,
          cashierName,
          paymentMethod: checkoutPaymentMethod,
          currency: checkoutCurrency,
          cashReceivedUsd: tenderMode === "MIXED" ? Number(paidUsd || 0) : undefined,
          cashReceivedBs: tenderMode === "MIXED" ? Number(paidBs || 0) : undefined,
          preSaleId: activePreSaleId,
          createdAt: new Date().toISOString(),
          status: "pending",
          items: cart.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPriceUsd: item.unitPriceUsd,
          })),
        })
        .then(() => {
          cart.clearCart();
          setCartOpen(false);
          setPaidUsd("");
          setPaidBs("");
          setActivePreSaleId(null);
          setMessage("Venta offline guardada. Se sincronizara al volver internet.");
          showToast("Venta offline pendiente", "info");
          playSound("success");
          void refreshOfflineSales();
        })
        .catch(() => {
          showToast("No pudimos guardar la venta offline", "error");
          playSound("error");
        })
        .finally(() => {
          checkoutLockRef.current = false;
        });
      return;
    }

    startTransition(async () => {
      const result = await checkoutAction({
        requestId: crypto.randomUUID(),
        paymentMethod: checkoutPaymentMethod,
        currency: checkoutCurrency,
        cashReceivedUsd: tenderMode === "MIXED" ? Number(paidUsd || 0) : undefined,
        cashReceivedBs: tenderMode === "MIXED" ? Number(paidBs || 0) : undefined,
        preSaleId: activePreSaleId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      if (result.ok && result.saleId) {
        setLastReceipt(buildReceipt(result.saleId));
        cart.clearCart();
        setCartOpen(false);
        setPaidUsd("");
        setPaidBs("");
        setActivePreSaleId(null);
        setMessage("Venta registrada");
        showToast("Venta realizada", "success");
        playSound("success");
        dispatchDrawerKick(hardwareSettings.openDrawerOnCash && (tenderMode === "CASH_USD" || tenderMode === "CASH_BS"));
        dispatchKitchenPrint({ saleId: result.saleId, items: cart.items, branchName });
        checkoutLockRef.current = false;
        return;
      }

      showToast(result.error ?? "No pudimos registrar la venta.", "error");
      playSound("error");
      setMessage(result.error ?? "No pudimos registrar la venta.");
      checkoutLockRef.current = false;
    });
  }, [
    buildReceipt,
    cart,
    checkoutCurrency,
    checkoutPaymentMethod,
    isPending,
    paidBs,
    paidUsd,
    playSound,
    showToast,
    tenderMode,
    activePreSaleId,
    hardwareSettings.openDrawerOnCash,
    branchName,
    businessId,
    cashSession.id,
    cashierName,
    refreshOfflineSales,
  ]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refreshOfflineSales();

    function handleOnline() {
      setOnline(true);
      void refreshOfflineSales();
    }

    function handleOffline() {
      setOnline(false);
      void refreshOfflineSales();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sevenpos:offline-queue-changed", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("sevenpos:offline-queue-changed", handleOnline);
    };
  }, [refreshOfflineSales]);

  useEffect(() => {
    if (!expenseOpen && !quickProductOpen && !cartOpen) {
      scannerInputRef.current?.focus({ preventScroll: true });
    }
  }, [cartOpen, expenseOpen, quickProductOpen]);

  useEffect(() => {
    if (expenseState.ok) {
      showToast("Gasto registrado", "success");
      playSound("success");
    } else if (expenseState.error) {
      showToast(expenseState.error, "error");
      playSound("error");
    }
  }, [expenseState.error, expenseState.ok, playSound, showToast]);

  useEffect(() => {
    if (productState.ok) {
      showToast("Producto creado", "success");
      playSound("success");
    } else if (productState.error) {
      showToast(productState.error, "error");
      playSound("error");
    }
  }, [playSound, productState.error, productState.ok, showToast]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const targetIsScanner = event.target === scannerInputRef.current;

      if (event.key === "F1") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "F2") {
        event.preventDefault();
        setQuickProductOpen(true);
        return;
      }

      if (event.key === "F3") {
        event.preventDefault();
        setExpenseOpen(true);
        return;
      }

      if (event.key === "F4") {
        event.preventDefault();
        router.push("/cash/close");
        return;
      }

      if (event.key === "F9") {
        event.preventDefault();
        handleCheckout();
        return;
      }

      if (event.key === "Escape") {
        setCartOpen(false);
        setExpenseOpen(false);
        setQuickProductOpen(false);
        return;
      }

      if (event.ctrlKey && event.key === "Delete") {
        event.preventDefault();
        cart.clearCart();
        showToast("Carrito vaciado", "info");
        return;
      }

      if (!targetIsScanner && !isEditableTarget(event.target)) {
        if (event.key === "+" || event.key === "*") {
          event.preventDefault();
          cart.incrementSelected();
          return;
        }

        if (event.key === "-") {
          event.preventDefault();
          cart.decrementSelected();
          return;
        }
      }

      if ((!targetIsScanner && isEditableTarget(event.target)) || event.altKey || event.ctrlKey || event.metaKey) return;

      const now = performance.now();
      if (now - lastKeyTimeRef.current > 90) {
        scannerBufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (event.key === "Enter") {
        const barcode = scannerBufferRef.current;
        scannerBufferRef.current = "";
        if (barcode.length >= 3) {
          event.preventDefault();
          handleScan(barcode);
        } else if (cart.items.length > 0) {
          event.preventDefault();
          handleCheckout();
        }
        return;
      }

      if (event.key.length === 1) {
        scannerBufferRef.current += event.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, handleCheckout, handleScan, router, showToast]);

  return (
    <div className="h-[100dvh] overflow-hidden bg-background lg:grid lg:grid-cols-[1fr_430px]">
      <input
        ref={scannerInputRef}
        aria-hidden="true"
        tabIndex={-1}
        autoComplete="off"
        inputMode="none"
        className="fixed -left-96 top-0 h-px w-px opacity-0"
      />
      <div className="pointer-events-none fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-52 rounded-lg border px-3 py-2 text-sm font-semibold shadow-[0_12px_35px_hsl(220_20%_10%/0.16)] animate-in fade-in-0 slide-in-from-top-2 duration-150 ${
              toast.tone === "success"
                ? "border-primary/20 bg-accent text-accent-foreground"
                : toast.tone === "error"
                  ? "border-destructive/20 bg-destructive/10 text-destructive"
                  : "bg-card text-foreground"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
      <section className="flex h-[100dvh] min-w-0 flex-col overflow-hidden">
        <div className="z-20 shrink-0 border-b bg-background/90 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)] shadow-[0_10px_24px_hsl(220_20%_10%/0.045)] backdrop-blur-xl sm:px-6 lg:px-5 lg:pt-4">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0 leading-none">
              <h1 className="text-[18px] font-semibold tracking-normal text-foreground lg:text-xl">Caja POS</h1>
              <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{businessName}</p>
            </div>
            <div className="shrink-0 rounded-lg border bg-card/92 px-3 py-2 text-right shadow-[0_6px_18px_hsl(220_20%_10%/0.08)]">
              <p className="text-[9px] font-medium uppercase leading-none text-muted-foreground">Tasa del día</p>
              <p className="mt-1 whitespace-nowrap text-sm font-semibold leading-none">1 USD = {exchangeRate.toFixed(2)} Bs</p>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <div className="min-w-0 rounded-lg border bg-card/90 px-3 py-2 shadow-[0_6px_18px_hsl(220_20%_10%/0.045)]">
              <p className="text-[10px] font-medium uppercase leading-none text-muted-foreground">Caja abierta</p>
              <p className="mt-1 truncate text-xs font-semibold">
                {money(cashSession.expectedUsd, "USD")} - Bs {cashSession.expectedBs.toFixed(2)} - {cashierName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpenseOpen(true)}
              className="flex h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold text-foreground shadow-[0_6px_18px_hsl(220_20%_10%/0.045)] active:scale-[0.98]"
            >
              <MinusCircle className="size-4 text-destructive" />
              <span className="hidden min-[390px]:inline">Gasto</span>
            </button>
            <Link
              href="/cash/close"
              className="flex h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold text-foreground shadow-[0_6px_18px_hsl(220_20%_10%/0.045)]"
            >
              <Banknote className="size-4 text-primary" />
              <span className="hidden min-[390px]:inline">Cerrar</span>
            </Link>
            <Link
              href="/pos/customer-display"
              target="_blank"
              className="hidden h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold text-foreground shadow-[0_6px_18px_hsl(220_20%_10%/0.045)] sm:flex"
            >
              <Monitor className="size-4 text-primary" />
              Cliente
            </Link>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto, Código..."
              className="h-10 rounded-lg bg-card/95 pl-10 pr-10 text-[15px] font-medium shadow-[0_8px_20px_hsl(220_20%_10%/0.075)]"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Limpiar busqueda"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="-mx-4 mt-2 flex touch-pan-x gap-1.5 overflow-x-auto px-4 pb-0.5 [-webkit-overflow-scrolling:touch] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <button
              type="button"
              onClick={() => setCategoryId("all")}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
                categoryId === "all"
                  ? "bg-primary text-primary-foreground shadow-[0_8px_18px_hsl(218_92%_35%/0.22)]"
                  : "bg-muted/90 text-muted-foreground"
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  categoryId === category.id
                    ? "bg-primary text-primary-foreground shadow-[0_8px_18px_hsl(218_92%_35%/0.22)]"
                    : "bg-muted/90 text-muted-foreground"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {preSales.length > 0 ? (
            <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [-webkit-overflow-scrolling:touch] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {preSales.map((preSale) => (
                <button
                  key={preSale.id}
                  type="button"
                  onClick={() => loadPreSale(preSale)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-[0.98] ${
                    activePreSaleId === preSale.id ? "border-primary bg-accent text-accent-foreground" : "bg-card text-foreground"
                  }`}
                >
                  <PackagePlus className="size-3.5" />
                  {preSale.code}
                  <span className="text-muted-foreground">{money(preSale.totalUsd, "USD")}</span>
                </button>
              ))}
            </div>
          ) : null}
          {(!online || pendingOfflineSales > 0) ? (
            <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              {!online ? "Modo offline activo" : "Sincronización pendiente"} · {pendingOfflineSales} ventas en cola
            </div>
          ) : null}
        </div>

        {message ? (
          <div className="mx-4 mt-2.5 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-[0_8px_22px_hsl(220_20%_10%/0.06)] sm:mx-6 lg:mx-7">
            <CheckCircle2 className="size-4 text-primary" />
            {message}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] pt-3 [-webkit-overflow-scrolling:touch] sm:px-6 lg:px-5 lg:pb-5">
          <ProductGrid products={filteredProducts} onAdd={(product) => addProductToCart(product)} />
        </div>
      </section>

      <aside className="hidden h-[100dvh] border-l bg-card lg:block">
        <CartPanel
          items={cart.items}
          tenderMode={tenderMode}
          loading={isPending}
          totalItems={cart.totalItems}
          totalUsd={cart.totalUsd}
          totalBs={cart.totalBs}
          exchangeRate={exchangeRate}
          paidUsd={paidUsd}
          paidBs={paidBs}
          selectedProductId={cart.selectedProductId}
          onTenderModeChange={setTenderMode}
          onPaidUsdChange={setPaidUsd}
          onPaidBsChange={setPaidBs}
          onSelectItem={cart.setSelectedProductId}
          onUpdateQuantity={cart.updateQuantity}
          onRemove={cart.removeItem}
          onCheckout={handleCheckout}
        />
      </aside>

      <MobileCartSheet
        open={cartOpen}
        items={cart.items}
        tenderMode={tenderMode}
        loading={isPending}
        totalItems={cart.totalItems}
        totalUsd={cart.totalUsd}
        totalBs={cart.totalBs}
        exchangeRate={exchangeRate}
        paidUsd={paidUsd}
        paidBs={paidBs}
        selectedProductId={cart.selectedProductId}
        onOpenChange={setCartOpen}
        onTenderModeChange={setTenderMode}
        onPaidUsdChange={setPaidUsd}
        onPaidBsChange={setPaidBs}
        onSelectItem={cart.setSelectedProductId}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        onCheckout={handleCheckout}
      />

      {lastReceipt ? (
        <>
          <div className="receipt-print-area">
            <ReceiptTemplate receipt={lastReceipt} size={hardwareSettings.ticketSize} />
          </div>
          <AutoPrint enabled={hardwareSettings.autoPrint} copies={hardwareSettings.copies} />
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/35 p-3 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-sm overflow-hidden rounded-lg border bg-card shadow-[0_28px_90px_hsl(220_20%_10%/0.26)] animate-in fade-in-0 slide-in-from-bottom-4 duration-150">
              <div className="border-b px-4 py-4 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <CheckCircle2 className="size-6" />
                </div>
                <p className="text-lg font-semibold">Venta completada</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {money(lastReceipt.totalUsd, "USD")} - Bs {lastReceipt.totalBs.toFixed(2)}
                </p>
              </div>
              <div className="max-h-[48dvh] overflow-y-auto bg-white p-4">
                <ReceiptTemplate receipt={lastReceipt} size={hardwareSettings.ticketSize} />
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <PrintReceiptButton className="h-11" />
                <NewSaleButton className="h-11" />
                <Button type="button" variant="ghost" className="col-span-2 h-10" onClick={() => setLastReceipt(null)}>
                  Seguir vendiendo
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {expenseOpen ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Cerrar gasto rapido"
              className="absolute inset-0 bg-foreground/25 backdrop-blur-[3px]"
              onClick={() => setExpenseOpen(false)}
            />
            <div
              className="absolute inset-x-3 bottom-3 rounded-lg border bg-card p-4 shadow-[0_24px_70px_hsl(220_20%_10%/0.22)] animate-in slide-in-from-bottom-4 duration-150 sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2"
            >
              <div className="mb-4">
                <p className="text-base font-semibold">Gasto rapido</p>
                <p className="text-sm text-muted-foreground">Registra una salida de efectivo de caja.</p>
              </div>
              <form action={expenseAction} className="space-y-3">
                <div className="grid grid-cols-[1fr_110px] gap-2">
                  <Input name="amount" type="number" min="0.01" step="0.01" placeholder="Monto" required />
                  <select name="currency" defaultValue="USD" className="h-11 rounded-lg border bg-background px-3 text-sm font-medium">
                    <option value="USD">USD</option>
                    <option value="BS">Bs</option>
                  </select>
                </div>
                <Input name="note" placeholder="Nota" />
                {expenseState.error ? <p className="text-sm font-semibold text-destructive">{expenseState.error}</p> : null}
                {expenseState.ok ? <p className="text-sm font-semibold text-primary">Gasto registrado</p> : null}
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setExpenseOpen(false)}>
                    Cancelar
                  </Button>
                  <Button className="flex-1" disabled={expensePending}>
                    {expensePending ? "Guardando..." : "Registrar"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

      <PremiumModal
        open={quickProductOpen}
        title="Producto rapido"
        description="F2 abre este formulario. Disponible en POS al guardar."
        onClose={() => setQuickProductOpen(false)}
      >
        <form action={productAction} className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input name="name" className="h-10" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Precio USD</Label>
              <Input name="priceUsd" type="number" min="0.01" step="0.01" className="h-10" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stock</Label>
              <Input name="stock" type="number" min="0" step="1" defaultValue="1" className="h-10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Barcode</Label>
              <Input name="barcode" className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SKU</Label>
              <Input name="sku" className="h-10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">categoría</Label>
            <Input name="category" list="pos-category-options" className="h-10" />
            <datalist id="pos-category-options">
              {categories.map((category) => (
                <option key={category.id} value={category.name} />
              ))}
            </datalist>
          </div>
          <input type="hidden" name="priceBs" value={(Number(0)).toString()} />
          <input type="hidden" name="lowStockAlert" value="5" />
          {productState.error ? <p className="text-sm font-semibold text-destructive">{productState.error}</p> : null}
          {productState.ok ? <p className="text-sm font-semibold text-primary">Producto creado. Actualiza POS para verlo.</p> : null}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setQuickProductOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" disabled={productPending}>
              {productPending ? "Guardando..." : "Crear"}
            </Button>
          </div>
        </form>
      </PremiumModal>

      <div className="sr-only" aria-live="polite">
        Total {money(cart.totalUsd, "USD")}
      </div>
    </div>
  );
}

