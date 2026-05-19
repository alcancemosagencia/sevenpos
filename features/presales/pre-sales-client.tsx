"use client";

import { useActionState, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Camera, CheckCircle2, Minus, Package, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPreSaleFormAction, type PreSaleActionState } from "@/features/presales/actions";
import { money } from "@/features/pos/format";
import type { PosProduct, ProductCategory } from "@/features/pos/types";
import { createOfflineId, offlineStore } from "@/features/pwa/offline-store";
import type { Html5Qrcode } from "html5-qrcode";

type PreSaleRow = {
  id: string;
  code: string;
  totalUsd: number;
  itemCount: number;
  createdBy: string;
  notes: string | null;
  items: Array<{ id: string; name: string; quantity: number; subtotalUsd: number }>;
};

type CartItem = PosProduct & { quantity: number };

const initialState: PreSaleActionState = {};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function PreSalesClient({
  branchName,
  products,
  categories,
  openPreSales,
}: {
  branchName: string;
  products: PosProduct[];
  categories: ProductCategory[];
  openPreSales: PreSaleRow[];
}) {
  const scannerRef = useRef<HTMLInputElement>(null);
  const cameraRegionId = useRef(`pre-sale-camera-${Math.random().toString(36).slice(2)}`);
  const scannerBufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const [state, action, pending] = useActionState(createPreSaleFormAction, initialState);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryId, setCategoryId] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.priceUsd * item.quantity, 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const filteredProducts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatches = categoryId === "all" || product.categoryId === categoryId;
      if (!categoryMatches) return false;
      if (!query) return true;
      return [product.name, product.sku, product.barcode].filter(Boolean).some((value) => value?.toLowerCase().includes(query));
    });
  }, [categoryId, deferredSearch, products]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const playScan = useCallback(() => {
    try {
      window.navigator.vibrate?.(35);
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 520;
      gain.gain.value = 0.025;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.07);
      oscillator.onended = () => void context.close();
    } catch {
      // Optional feedback.
    }
  }, []);

  const addProduct = useCallback((product: PosProduct, quantity = 1) => {
    if (product.stock <= 0) {
      showToast("Sin stock disponible");
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.stock, item.quantity + quantity) } : item);
      }
      return [...current, { ...product, quantity: Math.min(product.stock, quantity) }];
    });
    playScan();
    showToast(`${product.name} agregado`);
  }, [playScan, showToast]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== productId) return item;
        if (quantity <= 0) return [];
        return { ...item, quantity: Math.min(item.stock, quantity) };
      }),
    );
  }, []);

  const handleScan = useCallback((code: string) => {
    const normalized = code.trim().toLowerCase();
    const product = products.find((item) => item.barcode?.toLowerCase() === normalized || item.sku?.toLowerCase() === normalized);
    if (!product) {
      showToast("Barcode no encontrado");
      return;
    }
    addProduct(product);
  }, [addProduct, products, showToast]);

  const handlePreSaleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    if (navigator.onLine) return;
    event.preventDefault();

    if (cart.length === 0) {
      showToast("Agrega productos a la preventa");
      return;
    }

    const tempCode = `OFF-${String(Date.now()).slice(-4)}`;
    void offlineStore
      .addPreSale({
        id: createOfflineId("presale"),
        tempCode,
        branchName,
        notes,
        createdAt: new Date().toISOString(),
        status: "pending",
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPriceUsd: item.priceUsd,
        })),
      })
      .then(() => {
        setLastCode(tempCode);
        setCart([]);
        setNotes("");
        showToast("Preventa offline pendiente");
      })
      .catch(() => showToast("No pudimos guardar la preventa offline"));
  }, [branchName, cart, notes, showToast]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      const now = performance.now();
      if (now - lastKeyTimeRef.current > 90) scannerBufferRef.current = "";
      lastKeyTimeRef.current = now;

      if (event.key === "Enter") {
        const code = scannerBufferRef.current;
        scannerBufferRef.current = "";
        if (code.length >= 3) {
          event.preventDefault();
          handleScan(code);
        }
        return;
      }

      if (event.key.length === 1) scannerBufferRef.current += event.key;
    }

    window.addEventListener("keydown", handleKeyDown);
    scannerRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleScan]);

  useEffect(() => {
    if (!cameraOpen) return;
    let scanner: Html5Qrcode | null = null;
    let active = true;

    void import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (!active) return;
      const nextScanner = new Html5Qrcode(cameraRegionId.current);
      scanner = nextScanner;
      return nextScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 160 } },
        (decodedText: string) => {
          handleScan(decodedText);
          setCameraOpen(false);
        },
        () => undefined,
      );
    }).catch(() => showToast("No pudimos abrir la cámara"));

    return () => {
      active = false;
      const currentScanner = scanner;
      if (currentScanner) {
        void currentScanner.stop().then(() => currentScanner.clear()).catch(() => undefined);
      }
    };
  }, [cameraOpen, handleScan, showToast]);

  useEffect(() => {
    if ("ok" in state && state.ok) {
      setLastCode(state.code ?? "A01");
      setCart([]);
      setCartOpen(false);
      setNotes("");
      showToast("Preventa generada");
    }
    if ("error" in state && state.error) showToast(String(state.error));
  }, [openPreSales.length, showToast, state]);

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col space-y-3 pb-[calc(env(safe-area-inset-bottom)+9.75rem)] lg:pb-0">
      <input ref={scannerRef} aria-hidden="true" tabIndex={-1} className="fixed -left-96 top-0 size-px opacity-0" />
      {toast ? <div className="fixed right-3 top-3 z-[70] rounded-lg border bg-card px-3 py-2 text-sm font-semibold shadow-xl">{toast}</div> : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Preventa móvil</h1>
          <p className="text-sm text-muted-foreground">{branchName} Â· apoyo de venta sin caja.</p>
        </div>
        <Button type="button" variant="secondary" className="h-10 px-3" onClick={() => setCameraOpen(true)}>
          <Camera className="size-4" />
          Cámara
        </Button>
      </div>

      <div className="sticky top-0 z-10 -mx-4 space-y-2 border-b bg-background/88 px-4 py-2 backdrop-blur-xl lg:mx-0 lg:rounded-lg lg:border lg:bg-card/80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, SKU o barcode..." className="h-11 bg-card pl-10" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button type="button" onClick={() => setCategoryId("all")} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${categoryId === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Todos</button>
          {categories.map((category) => (
            <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${categoryId === category.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{category.name}</button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-cols-[1fr_380px]">
        <div className="grid auto-rows-max grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <button key={product.id} type="button" onClick={() => addProduct(product)} className="overflow-hidden rounded-lg border bg-card text-left shadow-[0_2px_8px_hsl(220_20%_10%/0.045)] transition active:scale-[0.98]">
              <div className="flex aspect-[1.15] items-center justify-center bg-accent text-accent-foreground">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="size-full object-cover" />
                ) : (
                  <Package className="size-8 opacity-70" />
                )}
              </div>
              <div className="space-y-1 p-2.5">
                <p className="line-clamp-2 min-h-9 text-sm font-semibold leading-[1.15]">{product.name}</p>
                <div className="flex items-end justify-between">
                  <p className="text-sm font-semibold text-primary">{money(product.priceUsd, "USD")}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">{product.stock} uds</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Card className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-20 hidden overflow-hidden lg:block lg:bottom-auto lg:top-4">
          <div className="flex items-center justify-between border-b p-3">
            <div>
              <p className="font-semibold">Carrito preventa</p>
              <p className="text-xs text-muted-foreground">{cart.length} productos</p>
            </div>
            <p className="text-lg font-semibold">{money(subtotal, "USD")}</p>
          </div>
          <div className="max-h-[38dvh] space-y-2 overflow-y-auto p-3 lg:max-h-[46dvh]">
            {cart.map((item) => (
              <div key={item.id} className="rounded-lg border bg-muted/35 p-2.5">
                <div className="flex justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-semibold">{item.name}</p>
                  <button type="button" onClick={() => updateQuantity(item.id, 0)} className="text-muted-foreground"><Trash2 className="size-4" /></button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex size-8 items-center justify-center rounded-lg bg-background"><Minus className="size-4" /></button>
                    <input value={item.quantity} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} className="h-8 w-12 rounded-lg border bg-card text-center text-sm font-medium" />
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex size-8 items-center justify-center rounded-lg bg-background"><Plus className="size-4" /></button>
                  </div>
                  <p className="text-sm font-semibold">{money(item.priceUsd * item.quantity, "USD")}</p>
                </div>
              </div>
            ))}
            {cart.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">Toca productos o escanea para armar la preventa.</div> : null}
          </div>
          <form action={action} onSubmit={handlePreSaleSubmit} className="space-y-2 border-t p-3">
            <input type="hidden" name="items" value={JSON.stringify(cart.map((item) => ({ productId: item.id, quantity: item.quantity })))} />
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} name="notes" placeholder="Observaciones" className="h-10" />
            <Button disabled={pending || cart.length === 0} className="h-11 w-full shadow-[0_14px_30px_hsl(218_92%_35%/0.2)]">
              <ShoppingBag className="size-4" />
              {pending ? "Generando..." : "Generar preventa"}
            </Button>
          </form>
        </Card>
      </div>

      {cart.length > 0 ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[72] flex h-14 items-center justify-between rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_18px_45px_hsl(218_92%_35%/0.32)] transition active:scale-[0.99] lg:hidden"
        >
          <span className="absolute -right-1.5 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-slate-950 px-1.5 text-[11px] font-semibold text-white shadow-md">
            {totalItems}
          </span>
          <span className="inline-flex min-w-0 items-center gap-2">
            <ShoppingBag className="size-4 shrink-0" />
            <span>Ver carrito</span>
            <span className="truncate text-primary-foreground/75">{totalItems} items</span>
          </span>
          <span>{money(subtotal, "USD")}</span>
        </button>
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-foreground/40 p-0 backdrop-blur-sm sm:p-2 lg:hidden" onClick={() => setCartOpen(false)}>
          <Card className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl shadow-[0_-24px_70px_hsl(220_20%_10%/0.28)]" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center justify-between border-b p-3">
              <div>
                <p className="font-semibold">Carrito preventa</p>
                <p className="text-xs text-muted-foreground">{totalItems} items</p>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="flex size-9 items-center justify-center rounded-lg bg-muted"><X className="size-4" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {cart.map((item) => (
                <div key={item.id} className="rounded-lg border bg-muted/35 p-2.5">
                  <div className="flex justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold">{item.name}</p>
                    <button type="button" onClick={() => updateQuantity(item.id, 0)} className="text-muted-foreground"><Trash2 className="size-4" /></button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex size-9 items-center justify-center rounded-lg bg-background"><Minus className="size-4" /></button>
                      <input value={item.quantity} onChange={(event) => updateQuantity(item.id, Number(event.target.value))} className="h-9 w-12 rounded-lg border bg-card text-center text-sm font-medium" />
                      <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex size-9 items-center justify-center rounded-lg bg-background"><Plus className="size-4" /></button>
                    </div>
                    <p className="text-sm font-semibold">{money(item.priceUsd * item.quantity, "USD")}</p>
                  </div>
                </div>
              ))}
            </div>
            <form action={action} onSubmit={handlePreSaleSubmit} className="shrink-0 space-y-2 border-t bg-card p-3 pb-[calc(env(safe-area-inset-bottom)+0.875rem)]">
              <input type="hidden" name="items" value={JSON.stringify(cart.map((item) => ({ productId: item.id, quantity: item.quantity })))} />
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} name="notes" placeholder="Observaciones" className="h-10" />
              <div className="flex items-end justify-between">
                <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                <span className="text-2xl font-semibold tracking-tight">{money(subtotal, "USD")}</span>
              </div>
              <Button disabled={pending || cart.length === 0} className="h-12 w-full shadow-[0_14px_30px_hsl(218_92%_35%/0.2)]">
                <ShoppingBag className="size-4" />
                {pending ? "Generando..." : "Generar preventa"}
              </Button>
            </form>
          </Card>
        </div>
      ) : null}

      {lastCode ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/35 p-3 backdrop-blur-sm sm:items-center">
          <Card className="w-full max-w-sm p-5 text-center shadow-[0_28px_90px_hsl(220_20%_10%/0.26)]">
            <CheckCircle2 className="mx-auto size-10 text-primary" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">Código preventa</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight">{lastCode}</p>
            <Button className="mt-5 h-11 w-full" onClick={() => setLastCode(null)}>Nueva preventa</Button>
          </Card>
        </div>
      ) : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-foreground/40 p-3 backdrop-blur-sm sm:items-center">
          <Card className="w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between border-b p-3">
              <p className="font-semibold">Escanear barcode</p>
              <button type="button" onClick={() => setCameraOpen(false)} className="flex size-9 items-center justify-center rounded-lg bg-muted"><X className="size-4" /></button>
            </div>
            <div id={cameraRegionId.current} className="min-h-72 bg-black" />
          </Card>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {openPreSales.map((preSale) => (
          <Card key={preSale.id} className="overflow-hidden">
            <div className="flex items-start justify-between border-b p-3">
              <div>
                <p className="text-xl font-semibold">{preSale.code}</p>
                <p className="text-xs text-muted-foreground">{preSale.itemCount} items Â· {preSale.createdBy}</p>
              </div>
              <p className="font-semibold">{money(preSale.totalUsd, "USD")}</p>
            </div>
            <div className="space-y-1.5 p-3 text-sm">
              {preSale.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="truncate font-semibold">{item.name}</span>
                  <span className="font-medium">{item.quantity}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
