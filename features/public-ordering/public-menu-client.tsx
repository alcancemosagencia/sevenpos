"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock, Minus, Plus, Search, ShoppingBag, Star, Store, Truck, Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPublicOrderAction } from "@/features/public-ordering/actions";
import { formatPublicMoney, isBusinessOpen, paymentOptions, publicCurrency } from "@/features/public-ordering/format";
import { GoogleAddressInput } from "@/features/public-ordering/google-address-input";
import type { FulfillmentMethod, PublicBusiness, PublicCartItem, PublicMenuProduct, PublicPaymentMethod } from "@/features/public-ordering/types";

const customerStorageKey = "sevenpos-public-customer";

type CustomerDraft = {
  name: string;
  phone: string;
  address: string;
  addressReference: string;
  notes: string;
  lat: number | null;
  lng: number | null;
};

const emptyCustomer: CustomerDraft = {
  name: "",
  phone: "",
  address: "",
  addressReference: "",
  notes: "",
  lat: null,
  lng: null,
};

function safeImage(url: string | null, fallback: string) {
  return url && url.trim() ? url : fallback;
}

export function PublicMenuClient({ business }: { business: PublicBusiness }) {
  const currency = publicCurrency(business.country, business.currency);
  const paymentMethods = paymentOptions(business.country);
  const openNow = isBusinessOpen(business.settings.activeDays, business.settings.openTime, business.settings.closeTime);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("popular");
  const [cart, setCart] = useState<PublicCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerDraft>(emptyCustomer);
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>(business.settings.deliveryEnabled ? "DELIVERY" : business.settings.pickupEnabled ? "PICKUP" : "DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<PublicPaymentMethod>(paymentMethods[0].value);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categories = useMemo(() => [{ id: "popular", name: "Popular" }, ...business.categories], [business.categories]);
  const availableFulfillment = useMemo(() => {
    const items: Array<{ value: FulfillmentMethod; label: string; icon: typeof Truck }> = [];
    if (business.settings.deliveryEnabled) items.push({ value: "DELIVERY", label: "Delivery", icon: Truck });
    if (business.settings.pickupEnabled) items.push({ value: "PICKUP", label: "Retiro", icon: Store });
    if (business.settings.dineInEnabled) items.push({ value: "DINE_IN", label: "Local", icon: Utensils });
    return items;
  }, [business.settings.deliveryEnabled, business.settings.dineInEnabled, business.settings.pickupEnabled]);

  useEffect(() => {
    const raw = window.localStorage.getItem(customerStorageKey);
    if (!raw) return;
    try {
      setCustomer({ ...emptyCustomer, ...(JSON.parse(raw) as Partial<CustomerDraft>) });
    } catch {
      // Customer profile is optional.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(customerStorageKey, JSON.stringify(customer));
  }, [customer]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const popularProducts = business.products.slice(0, 8);
    const pool = categoryId === "popular" ? popularProducts : business.products.filter((product) => product.categoryId === categoryId);

    if (!normalized) return pool;
    return pool.filter((product) =>
      [product.name, product.description, product.categoryName].filter(Boolean).some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [business.products, categoryId, query]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = fulfillment === "DELIVERY" ? business.settings.deliveryFee : 0;
  const tax = subtotal * (business.settings.taxRate / 100);
  const total = subtotal + deliveryFee + tax;

  const addProduct = useCallback((product: PublicMenuProduct) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== productId) return item;
      if (quantity <= 0) return [];
      return { ...item, quantity };
    }));
  }, []);

  const submitOrder = useCallback(() => {
    setMessage(null);
    if (!openNow) {
      setMessage("El negocio está cerrado actualmente.");
      return;
    }

    startTransition(async () => {
      const result = await createPublicOrderAction({
        businessId: business.id,
        businessSlug: business.slug,
        fulfillmentMethod: fulfillment,
        customerName: customer.name,
        customerPhone: customer.phone,
        address: customer.address,
        addressReference: customer.addressReference,
        lat: customer.lat,
        lng: customer.lng,
        notes: customer.notes,
        paymentMethod,
        acceptedTerms,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
      });

      if (result.ok) {
        setCreatedCode(result.code ?? "WEB");
        setCart([]);
        setAcceptedTerms(false);
        return;
      }

      setMessage(result.error ?? "No pudimos crear el pedido.");
    });
  }, [acceptedTerms, business.id, business.slug, cart, customer, fulfillment, openNow, paymentMethod]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto min-h-dvh max-w-xl bg-background shadow-[0_0_80px_hsl(224_40%_20%/0.08)] lg:my-6 lg:overflow-hidden lg:rounded-lg lg:border">
        <section className="relative h-56 overflow-hidden bg-slate-950">
          <Image
            src={safeImage(business.settings.coverImageUrl, "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=640&fit=crop")}
            alt={business.name}
            fill
            priority
            unoptimized
            className="object-cover opacity-55"
            sizes="(max-width: 768px) 100vw, 576px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <div className="mb-3 flex items-end gap-3">
              <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-lg bg-white/12 text-lg font-semibold ring-1 ring-white/20 backdrop-blur-md">
                {business.settings.logoUrl ? (
                  <Image src={business.settings.logoUrl} alt={business.name} fill unoptimized className="object-contain p-1.5" sizes="56px" />
                ) : (
                  "S7"
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${openNow ? "bg-white text-slate-900" : "bg-red-500 text-white"}`}>
                    {openNow ? "Abierto" : "Cerrado actualmente"}
                  </span>
                  {business.settings.deliveryEnabled ? <span className="rounded-lg bg-white/15 px-2 py-1 text-[11px] font-medium backdrop-blur">Delivery</span> : null}
                  {business.settings.pickupEnabled ? <span className="rounded-lg bg-white/15 px-2 py-1 text-[11px] font-medium backdrop-blur">Retiro</span> : null}
                </div>
                <h1 className="truncate text-2xl font-semibold tracking-normal">{business.name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-semibold text-white/82">
                  <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" /> {business.settings.rating.toFixed(1)}</span>
                  <span>{business.settings.distanceLabel}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {business.settings.etaLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="sticky top-0 z-20 border-b bg-background/90 px-4 py-3 backdrop-blur-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos..." className="h-10 bg-card pl-9 shadow-sm" />
          </div>
          <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [-webkit-overflow-scrolling:touch]">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition active:scale-[0.98] ${categoryId === category.id ? "bg-slate-950 text-white shadow-lg" : "bg-muted text-muted-foreground"}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <section className="space-y-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+6.5rem)]">
          {filteredProducts.map((product) => {
            const inCart = cart.find((item) => item.id === product.id);
            return (
              <motion.article
                key={product.id}
                layout
                whileTap={{ scale: 0.992 }}
                className="flex overflow-hidden rounded-lg border bg-card shadow-[0_8px_24px_hsl(224_30%_20%/0.05)]"
              >
                <div className="flex min-w-0 flex-1 flex-col p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-tight">{product.name}</p>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">{product.description || "Producto disponible para ordenar."}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatPublicMoney(product.price, currency)}</span>
                    {business.businessType === "RESTAURANT" ? <span className="text-[10px] font-medium text-muted-foreground">Disponible</span> : null}
                  </div>
                  <div className="mt-auto pt-2">
                    {inCart ? (
                      <div className="flex w-fit items-center gap-2 rounded-lg bg-muted p-1">
                        <button type="button" onClick={() => updateQuantity(product.id, inCart.quantity - 1)} className="flex size-7 items-center justify-center rounded-md bg-card"><Minus className="size-3.5" /></button>
                        <span className="w-5 text-center text-xs font-semibold">{inCart.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(product.id, inCart.quantity + 1)} className="flex size-7 items-center justify-center rounded-md bg-card"><Plus className="size-3.5" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => addProduct(product)} className="h-8 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white active:scale-95">
                        Agregar
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative h-32 w-32 shrink-0 bg-muted">
                  <Image
                    src={safeImage(product.imageUrl, "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop")}
                    alt={product.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
              </motion.article>
            );
          })}
          {filteredProducts.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="font-semibold">No hay productos</p>
              <p className="mt-1 text-sm text-muted-foreground">Prueba otra búsqueda o categoría.</p>
            </div>
          ) : null}
        </section>
      </div>

      <AnimatePresence>
        {cartCount > 0 ? (
          <motion.div initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }} className="fixed inset-x-0 bottom-0 z-40 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="mx-auto max-w-xl">
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="flex h-16 w-full items-center justify-between rounded-lg bg-slate-950 px-4 text-white shadow-[0_20px_60px_hsl(224_40%_8%/0.34)] active:scale-[0.99]"
              >
                <span className="flex items-center gap-3 text-sm font-semibold">
                  <span className="relative">
                    <ShoppingBag className="size-5" />
                    <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">{cartCount}</span>
                  </span>
                  Ver carrito
                </span>
                <span className="text-sm font-semibold">{formatPublicMoney(total, currency)}</span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen ? (
          <div className="fixed inset-0 z-50">
            <motion.button
              type="button"
              aria-label="Cerrar carrito"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/42 backdrop-blur-[3px]"
              onClick={() => setCartOpen(false)}
            />
            <motion.section
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 330 }}
              className="absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-xl overflow-hidden rounded-t-lg border bg-card shadow-[0_-24px_90px_hsl(224_40%_8%/0.25)]"
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/25" />
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-lg font-semibold">Tu pedido</p>
                  <p className="text-xs text-muted-foreground">{cartCount} productos en carrito</p>
                </div>
                <button type="button" onClick={() => setCartOpen(false)} className="flex size-9 items-center justify-center rounded-lg bg-muted"><X className="size-4" /></button>
              </div>

              <div className="max-h-[calc(92dvh-72px)] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                <div className="space-y-2 py-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-lg border bg-muted/35 p-2.5">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image src={safeImage(item.imageUrl, "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop")} alt={item.name} fill unoptimized className="object-cover" sizes="56px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPublicMoney(item.price, currency)} c/u</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex size-8 items-center justify-center rounded-lg bg-card"><Minus className="size-4" /></button>
                          <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="flex size-8 items-center justify-center rounded-lg bg-card"><Plus className="size-4" /></button>
                        </div>
                      </div>
                      <p className="self-center text-sm font-semibold">{formatPublicMoney(item.price * item.quantity, currency)}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t py-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    {availableFulfillment.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.value} type="button" onClick={() => setFulfillment(item.value)} className={`flex h-11 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold ${fulfillment === item.value ? "border-primary bg-accent text-accent-foreground" : "bg-background text-muted-foreground"}`}>
                          <Icon className="size-3.5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {paymentMethods.map((method) => (
                      <button key={method.value} type="button" onClick={() => setPaymentMethod(method.value)} className={`h-10 rounded-lg border px-2 text-xs font-semibold ${paymentMethod === method.value ? "border-primary bg-accent text-accent-foreground" : "bg-background text-muted-foreground"}`}>
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-t py-3">
                  <Input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre completo" className="h-11" required />
                  <Input value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="Teléfono celular" className="h-11" required />
                  {fulfillment === "DELIVERY" ? (
                    <>
                      <GoogleAddressInput
                        required
                        value={{ address: customer.address, lat: customer.lat, lng: customer.lng }}
                        onChange={(value) => setCustomer((current) => ({ ...current, ...value }))}
                      />
                      <Input value={customer.addressReference} onChange={(event) => setCustomer((current) => ({ ...current, addressReference: event.target.value }))} placeholder="Referencia" className="h-11" />
                    </>
                  ) : null}
                  <Input value={customer.notes} onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))} placeholder="Notas del pedido" className="h-11" />
                  <label className="flex items-start gap-2 rounded-lg border bg-background p-3 text-xs font-semibold text-muted-foreground">
                    <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 size-4 accent-primary" />
                    <span>Acepto términos y condiciones{business.settings.termsUrl ? " del negocio" : ""}.</span>
                  </label>
                </div>

                <div className="space-y-2 border-t py-3 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPublicMoney(subtotal, currency)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{formatPublicMoney(deliveryFee, currency)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Impuestos</span><span>{formatPublicMoney(tax, currency)}</span></div>
                  {business.country?.toLowerCase().includes("venezuela") ? <div className="flex justify-between text-muted-foreground"><span>Total Bs</span><span>Bs {(total * business.exchangeRate).toFixed(2)}</span></div> : null}
                  <div className="flex items-center justify-between pt-2 text-lg font-semibold"><span>Total</span><span>{formatPublicMoney(total, currency)}</span></div>
                </div>

                {message ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">{message}</p> : null}
                <div className="sticky bottom-0 -mx-4 bg-card px-4 pb-4 pt-2">
                  <Button disabled={pending || !openNow || cart.length === 0} onClick={submitOrder} className="h-12 w-full bg-slate-950 text-white hover:bg-slate-900">
                    {pending ? "Confirmando..." : `Confirmar pedido · ${formatPublicMoney(total, currency)}`}
                  </Button>
                  {!openNow ? <p className="mt-2 text-center text-xs font-medium text-destructive">Checkout bloqueado porque el negocio está cerrado.</p> : null}
                </div>
              </div>
            </motion.section>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {createdCode ? (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="w-full max-w-sm rounded-lg border bg-card p-5 text-center shadow-2xl">
              <CheckCircle2 className="mx-auto size-11 text-primary" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">Pedido recibido</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight">{createdCode}</p>
              <p className="mt-2 text-sm text-muted-foreground">Guardamos tu perfil localmente para próximos pedidos. Tracking y pagos online quedan preparados para la siguiente fase.</p>
              <Button className="mt-5 h-11 w-full" onClick={() => { setCreatedCode(null); setCartOpen(false); }}>
                Nuevo pedido
              </Button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
