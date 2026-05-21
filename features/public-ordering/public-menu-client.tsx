"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Headphones,
  Home,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Store,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPublicOrderAction } from "@/features/public-ordering/actions";
import { formatPublicMoney, isBusinessOpen, paymentOptions, publicCurrency } from "@/features/public-ordering/format";
import { GoogleAddressInput } from "@/features/public-ordering/google-address-input";
import type { FulfillmentMethod, PublicBusiness, PublicCartItem, PublicMenuProduct, PublicPaymentMethod } from "@/features/public-ordering/types";

const customerStorageKey = "sevenpos-public-customer";
const orderStorageKey = "sevenpos-public-orders";

type CustomerDraft = {
  name: string;
  phone: string;
  email: string;
  address: string;
  addressReference: string;
  notes: string;
  lat: number | null;
  lng: number | null;
};

type LocalOrder = {
  code: string;
  total: number;
  createdAt: string;
  fulfillment: FulfillmentMethod;
  paymentMethod: string;
  status: "Recibido" | "Confirmado" | "Preparando" | "Listo" | "En camino" | "Entregado";
};

const emptyCustomer: CustomerDraft = {
  name: "",
  phone: "",
  email: "",
  address: "",
  addressReference: "",
  notes: "",
  lat: null,
  lng: null,
};

const darkFieldClass =
  "border-[#23262F] bg-[#0F1115] text-white placeholder:text-[#7C8190] focus-visible:border-[#3B82F6] focus-visible:ring-[#3B82F6]/20";
const darkCardClass = "rounded-[7px] border border-[#2A2D36] bg-[#15171D]";
const darkButtonClass = "rounded-[7px] transition active:scale-[0.98]";

function safeImage(url: string | null, fallback: string) {
  return url && url.trim() ? url : fallback;
}

function fulfillmentLabel(value: FulfillmentMethod) {
  if (value === "DELIVERY") return "Entrega";
  if (value === "PICKUP") return "Retiro";
  return "Comer en local";
}

function paymentIcon(value: PublicPaymentMethod) {
  if (value === "cash") return Wallet;
  return CreditCard;
}

export function PublicMenuClient({ business }: { business: PublicBusiness }) {
  const currency = publicCurrency(business.country, business.currency);
  const paymentMethods = paymentOptions(business.country);
  const openNow = isBusinessOpen(business.settings.activeDays, business.settings.openTime, business.settings.closeTime);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("popular");
  const [cart, setCart] = useState<PublicCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selector, setSelector] = useState<"fulfillment" | "payment" | null>(null);
  const [customer, setCustomer] = useState<CustomerDraft>(emptyCustomer);
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>(business.settings.deliveryEnabled ? "DELIVERY" : business.settings.pickupEnabled ? "PICKUP" : "DINE_IN");
  const [paymentMethod, setPaymentMethod] = useState<PublicPaymentMethod>(paymentMethods[0]?.value ?? "cash");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categories = useMemo(() => [{ id: "popular", name: "Popular" }, ...business.categories], [business.categories]);
  const availableFulfillment = useMemo(() => {
    const items: Array<{ value: FulfillmentMethod; label: string; description: string; icon: typeof Truck }> = [];
    if (business.settings.deliveryEnabled) items.push({ value: "DELIVERY", label: "Entrega", description: `${business.settings.etaLabel} · ${formatPublicMoney(business.settings.deliveryFee, currency)}`, icon: Truck });
    if (business.settings.pickupEnabled) items.push({ value: "PICKUP", label: "Retiro", description: "Compra y retira en tienda", icon: Store });
    if (business.settings.dineInEnabled) items.push({ value: "DINE_IN", label: "Comer en local", description: "Disponible en el local", icon: Home });
    return items;
  }, [business.settings.deliveryEnabled, business.settings.dineInEnabled, business.settings.etaLabel, business.settings.pickupEnabled, business.settings.deliveryFee, currency]);

  useEffect(() => {
    const rawCustomer = window.localStorage.getItem(customerStorageKey);
    const rawOrders = window.localStorage.getItem(orderStorageKey);
    if (rawCustomer) {
      try {
        setCustomer({ ...emptyCustomer, ...(JSON.parse(rawCustomer) as Partial<CustomerDraft>) });
      } catch {
        setCustomer(emptyCustomer);
      }
    }
    if (rawOrders) {
      try {
        const parsed = JSON.parse(rawOrders) as LocalOrder[];
        setOrders(Array.isArray(parsed) ? parsed : []);
      } catch {
        setOrders([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(customerStorageKey, JSON.stringify(customer));
  }, [customer]);

  useEffect(() => {
    window.localStorage.setItem(orderStorageKey, JSON.stringify(orders));
  }, [orders]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const popularProducts = business.products.slice(0, 10);
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
  const selectedPayment = paymentMethods.find((method) => method.value === paymentMethod) ?? paymentMethods[0];

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
        const code = result.code ?? "WEB";
        setCreatedCode(code);
        setOrders((current) => [
          {
            code,
            total,
            createdAt: new Date().toISOString(),
            fulfillment,
            paymentMethod: selectedPayment?.label ?? paymentMethod,
            status: "Recibido" as const,
          },
          ...current,
        ].slice(0, 20));
        setCart([]);
        setAcceptedTerms(false);
        return;
      }

      setMessage(result.error ?? "No pudimos crear el pedido.");
    });
  }, [acceptedTerms, business.id, business.slug, cart, customer, fulfillment, openNow, paymentMethod, selectedPayment?.label, total]);

  return (
    <main className="public-store min-h-dvh bg-[#090A0C] text-white">
      <div className="mx-auto min-h-dvh max-w-xl bg-[#0B0D11] shadow-[0_0_90px_rgba(0,0,0,.32)] lg:my-6 lg:overflow-hidden lg:rounded-[7px] lg:border lg:border-[#2A2D36]">
        <section className="relative h-60 overflow-hidden bg-black">
          <Image
            src={safeImage(business.settings.coverImageUrl, "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=640&fit=crop")}
            alt={business.name}
            fill
            priority
            unoptimized
            className="object-cover opacity-65"
            sizes="(max-width: 768px) 100vw, 576px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1012] via-black/25 to-black/35" />
          <div className="absolute inset-x-0 top-0 flex items-center p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <button type="button" onClick={() => setProfileOpen(true)} className={`${darkButtonClass} flex size-10 items-center justify-center border border-[#2A2D36] bg-[#0F1115]/80 text-white backdrop-blur`}>
              <Menu className="size-5" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="mb-3 flex items-end gap-3">
              <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-[7px] border border-[#2A2D36] bg-[#0F1115] text-sm font-semibold text-white">
                {business.settings.logoUrl ? (
                  <Image src={business.settings.logoUrl} alt={business.name} fill unoptimized className="object-contain p-2" sizes="64px" />
                ) : (
                  "S7"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-[6px] px-2 py-1 text-[10px] font-medium ${openNow ? "bg-white text-slate-950" : "bg-red-500 text-white"}`}>
                    {openNow ? "Abierto" : "Cerrado actualmente"}
                  </span>
                  {business.settings.deliveryEnabled ? <span className="rounded-[6px] border border-[#2A2D36] bg-[#0F1115]/75 px-2 py-1 text-[10px] font-medium backdrop-blur">Delivery</span> : null}
                  {business.settings.pickupEnabled ? <span className="rounded-[6px] border border-[#2A2D36] bg-[#0F1115]/75 px-2 py-1 text-[10px] font-medium backdrop-blur">Retiro</span> : null}
                </div>
                <h1 className="truncate text-2xl font-semibold tracking-tight">{business.name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-medium text-white/78">
                  <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-yellow-400 text-yellow-400" /> {business.settings.rating.toFixed(1)}</span>
                  <span>{business.settings.distanceLabel}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {business.settings.etaLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="sticky top-0 z-20 border-b border-[#2A2D36] bg-[#0B0D11]/92 px-4 py-3 backdrop-blur-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar productos..."
              className={`h-11 pl-10 text-sm ${darkFieldClass}`}
            />
          </div>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5 [-webkit-overflow-scrolling:touch]">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`${darkButtonClass} shrink-0 px-4 py-2 text-xs font-medium ${categoryId === category.id ? "bg-white text-slate-950" : "border border-[#2A2D36] bg-[#0F1115] text-[#C7CBD6]"}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <section className="space-y-2.5 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+7rem)]">
          {filteredProducts.map((product) => {
            const inCart = cart.find((item) => item.id === product.id);
            return (
              <motion.article
                key={product.id}
                layout
                whileTap={{ scale: 0.992 }}
                className={`${darkCardClass} flex overflow-hidden shadow-[0_14px_38px_rgba(0,0,0,.18)]`}
              >
                <div className="flex min-w-0 flex-1 flex-col p-3.5">
                  <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">{product.name}</p>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-white/48">{product.description || "Producto disponible para ordenar."}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{formatPublicMoney(product.price, currency)}</span>
                    <span className="text-[10px] font-medium text-white/35">{product.stock} disponibles</span>
                  </div>
                  <div className="mt-auto pt-3">
                    {inCart ? (
                      <div className="flex w-fit items-center gap-2 rounded-[7px] bg-white p-1 text-slate-950">
                        <button type="button" onClick={() => updateQuantity(product.id, inCart.quantity - 1)} className={`${darkButtonClass} flex size-8 items-center justify-center bg-slate-100`}><Minus className="size-3.5" /></button>
                        <span className="w-5 text-center text-xs font-semibold">{inCart.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(product.id, inCart.quantity + 1)} className={`${darkButtonClass} flex size-8 items-center justify-center bg-slate-950 text-white`}><Plus className="size-3.5" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => addProduct(product)} className={`${darkButtonClass} h-9 bg-white px-4 text-xs font-semibold text-slate-950`}>
                        Agregar
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative m-2 h-32 w-32 shrink-0 overflow-hidden rounded-[6px] border border-[#2A2D36] bg-[#0F1115]">
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
            <div className={`${darkCardClass} p-8 text-center`}>
              <p className="font-semibold">No hay productos</p>
              <p className="mt-1 text-sm text-white/45">Prueba otra búsqueda o categoría.</p>
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
                className={`${darkButtonClass} flex h-16 w-full items-center justify-between bg-white px-4 text-slate-950 shadow-[0_22px_70px_rgba(0,0,0,.34)]`}
              >
                <span className="flex items-center gap-3 text-sm font-semibold">
                  <span className="relative">
                    <ShoppingBag className="size-5" />
                    <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-[6px] bg-slate-950 text-[10px] font-semibold text-white">{cartCount}</span>
                  </span>
                  Ver carrito
                </span>
                <span className="text-sm font-semibold">{formatPublicMoney(total, currency)}</span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        cartCount={cartCount}
        currency={currency}
        total={total}
        subtotal={subtotal}
        tax={tax}
        deliveryFee={deliveryFee}
        business={business}
        fulfillment={fulfillment}
        paymentLabel={selectedPayment?.label ?? "Efectivo"}
        customer={customer}
        acceptedTerms={acceptedTerms}
        message={message}
        pending={pending}
        openNow={openNow}
        updateQuantity={updateQuantity}
        setCustomer={setCustomer}
        setAcceptedTerms={setAcceptedTerms}
        setSelector={setSelector}
        submitOrder={submitOrder}
      />

      <SelectorSheet
        type={selector}
        onClose={() => setSelector(null)}
        fulfillment={fulfillment}
        paymentMethod={paymentMethod}
        fulfillmentOptions={availableFulfillment}
        paymentOptions={paymentMethods}
        onFulfillment={(value) => {
          setFulfillment(value);
          setSelector(null);
        }}
        onPayment={(value) => {
          setPaymentMethod(value);
          setSelector(null);
        }}
      />

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        customer={customer}
        setCustomer={setCustomer}
        orders={orders}
        businessPhone={business.phone}
        currency={currency}
      />

      <AnimatePresence>
        {createdCode ? (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="w-full max-w-sm rounded-[7px] border border-[#2A2D36] bg-[#111318] p-5 text-center text-white shadow-2xl">
              <CheckCircle2 className="mx-auto size-11 text-emerald-400" />
              <p className="mt-3 text-sm font-medium text-white/55">Pedido recibido</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight">{createdCode}</p>
              <p className="mt-2 text-sm text-white/55">Puedes revisar el seguimiento desde Perfil → Pedidos.</p>
              <Button className="mt-5 h-11 w-full rounded-[7px] bg-white text-slate-950 hover:bg-white/90" onClick={() => { setCreatedCode(null); setCartOpen(false); }}>
                Nuevo pedido
              </Button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function CartSheet({
  open,
  onClose,
  cart,
  cartCount,
  currency,
  total,
  subtotal,
  tax,
  deliveryFee,
  business,
  fulfillment,
  paymentLabel,
  customer,
  acceptedTerms,
  message,
  pending,
  openNow,
  updateQuantity,
  setCustomer,
  setAcceptedTerms,
  setSelector,
  submitOrder,
}: {
  open: boolean;
  onClose: () => void;
  cart: PublicCartItem[];
  cartCount: number;
  currency: string;
  total: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  business: PublicBusiness;
  fulfillment: FulfillmentMethod;
  paymentLabel: string;
  customer: CustomerDraft;
  acceptedTerms: boolean;
  message: string | null;
  pending: boolean;
  openNow: boolean;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: React.Dispatch<React.SetStateAction<CustomerDraft>>;
  setAcceptedTerms: (value: boolean) => void;
  setSelector: (value: "fulfillment" | "payment") => void;
  submitOrder: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.button type="button" aria-label="Cerrar carrito" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" onClick={onClose} />
          <motion.section
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 330 }}
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[94dvh] max-w-xl overflow-hidden rounded-t-[7px] border border-[#2A2D36] bg-[#111318] text-white shadow-[0_-24px_90px_rgba(0,0,0,.42)]"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-[6px] bg-[#2A2D36]" />
            <div className="flex items-center justify-between border-b border-[#2A2D36] px-4 py-3">
              <div>
                <p className="text-lg font-semibold">Checkout</p>
                <p className="text-xs text-white/45">{cartCount} productos en carrito</p>
              </div>
              <button type="button" onClick={onClose} className={`${darkButtonClass} flex size-9 items-center justify-center border border-[#2A2D36] bg-[#0F1115]`}><X className="size-4" /></button>
            </div>

            <div className="max-h-[calc(94dvh-72px)] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <div className="space-y-2 py-3">
                {cart.map((item) => (
                  <div key={item.id} className={`${darkCardClass} flex gap-3 p-2.5`}>
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-[6px] border border-[#2A2D36] bg-[#0F1115]">
                      <Image src={safeImage(item.imageUrl, "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop")} alt={item.name} fill unoptimized className="object-cover" sizes="56px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-white/45">{formatPublicMoney(item.price, currency)} c/u</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className={`${darkButtonClass} flex size-8 items-center justify-center border border-[#2A2D36] bg-[#0F1115]`}><Minus className="size-4" /></button>
                        <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className={`${darkButtonClass} flex size-8 items-center justify-center bg-white text-slate-950`}><Plus className="size-4" /></button>
                      </div>
                    </div>
                    <p className="self-center text-sm font-semibold">{formatPublicMoney(item.price * item.quantity, currency)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-[#2A2D36] py-3">
                <ChoiceButton label="Entrega" value={fulfillmentLabel(fulfillment)} icon={Truck} onClick={() => setSelector("fulfillment")} />
                <ChoiceButton label="Forma de pago" value={paymentLabel} icon={CreditCard} onClick={() => setSelector("payment")} />
              </div>

              <div className="space-y-2 border-t border-[#2A2D36] py-3">
                <Input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre completo" className={`h-11 ${darkFieldClass}`} required />
                <Input value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="WhatsApp" className={`h-11 ${darkFieldClass}`} required />
                {fulfillment === "DELIVERY" ? (
                  <>
                    <GoogleAddressInput required value={{ address: customer.address, lat: customer.lat, lng: customer.lng }} onChange={(value) => setCustomer((current) => ({ ...current, ...value }))} />
                    <Input value={customer.addressReference} onChange={(event) => setCustomer((current) => ({ ...current, addressReference: event.target.value }))} placeholder="Referencia" className={`h-11 ${darkFieldClass}`} />
                  </>
                ) : null}
                <Input value={customer.notes} onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))} placeholder="Notas del pedido" className={`h-11 ${darkFieldClass}`} />
                <label className={`${darkCardClass} flex items-start gap-2 p-3 text-xs font-medium text-white/58`}>
                  <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 size-4 accent-white" />
                  <span>Acepto términos y condiciones{business.settings.termsUrl ? " del negocio" : ""}.</span>
                </label>
              </div>

              <div className="space-y-2 border-t border-[#2A2D36] py-3 text-sm">
                <div className="flex justify-between text-white/50"><span>Subtotal</span><span>{formatPublicMoney(subtotal, currency)}</span></div>
                <div className="flex justify-between text-white/50"><span>Delivery</span><span>{formatPublicMoney(deliveryFee, currency)}</span></div>
                <div className="flex justify-between text-white/50"><span>Impuestos</span><span>{formatPublicMoney(tax, currency)}</span></div>
                {business.country?.toLowerCase().includes("venezuela") ? <div className="flex justify-between text-white/50"><span>Total Bs</span><span>Bs {(total * business.exchangeRate).toFixed(2)}</span></div> : null}
                <div className="flex items-center justify-between pt-2 text-lg font-semibold"><span>Total</span><span>{formatPublicMoney(total, currency)}</span></div>
              </div>

              {message ? <p className="rounded-[7px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200">{message}</p> : null}
              <div className="sticky bottom-0 -mx-4 bg-[#111318] px-4 pb-4 pt-2">
                <Button disabled={pending || !openNow || cart.length === 0} onClick={submitOrder} className="h-12 w-full rounded-[7px] bg-white text-slate-950 hover:bg-white/90">
                  {pending ? "Confirmando..." : `Confirmar pedido · ${formatPublicMoney(total, currency)}`}
                </Button>
                {!openNow ? <p className="mt-2 text-center text-xs font-medium text-red-200">Checkout bloqueado porque el negocio está cerrado.</p> : null}
              </div>
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function ChoiceButton({ label, value, icon: Icon, onClick }: { label: string; value: string; icon: typeof Truck; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${darkButtonClass} flex h-14 w-full items-center justify-between border border-[#2A2D36] bg-[#15171D] px-3 text-left`}>
      <span className="flex items-center gap-3">
        <span className={`${darkButtonClass} flex size-9 items-center justify-center bg-white text-slate-950`}><Icon className="size-4" /></span>
        <span>
          <span className="block text-xs text-white/45">{label}</span>
          <span className="block text-sm font-semibold">{value}</span>
        </span>
      </span>
      <ChevronRight className="size-4 text-white/35" />
    </button>
  );
}

function SelectorSheet({
  type,
  onClose,
  fulfillment,
  paymentMethod,
  fulfillmentOptions,
  paymentOptions: methods,
  onFulfillment,
  onPayment,
}: {
  type: "fulfillment" | "payment" | null;
  onClose: () => void;
  fulfillment: FulfillmentMethod;
  paymentMethod: PublicPaymentMethod;
  fulfillmentOptions: Array<{ value: FulfillmentMethod; label: string; description: string; icon: typeof Truck }>;
  paymentOptions: readonly { value: PublicPaymentMethod; label: string }[];
  onFulfillment: (value: FulfillmentMethod) => void;
  onPayment: (value: PublicPaymentMethod) => void;
}) {
  return (
    <AnimatePresence>
      {type ? (
        <div className="fixed inset-0 z-[58]">
          <motion.button type="button" aria-label="Cerrar selector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" />
          <motion.section initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 330 }} className="absolute inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-[7px] border border-[#2A2D36] bg-[#111318] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-white">
            <div className="mx-auto mb-4 h-1 w-10 rounded-[6px] bg-[#2A2D36]" />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-lg font-semibold">{type === "fulfillment" ? "Elige entrega" : "Forma de pago"}</p>
              <button type="button" onClick={onClose} className={`${darkButtonClass} flex size-9 items-center justify-center border border-[#2A2D36] bg-[#0F1115]`}><X className="size-4" /></button>
            </div>
            <div className="space-y-2">
              {type === "fulfillment"
                ? fulfillmentOptions.map((item) => {
                    const Icon = item.icon;
                    const selected = fulfillment === item.value;
                    return (
                      <button key={item.value} type="button" onClick={() => onFulfillment(item.value)} className={`${darkButtonClass} flex w-full items-center justify-between border p-3 text-left ${selected ? "border-[#2A2D36] bg-white text-slate-950" : "border-[#2A2D36] bg-[#15171D]"}`}>
                        <span className="flex items-center gap-3">
                          <span className={`${darkButtonClass} flex size-10 items-center justify-center ${selected ? "bg-slate-950 text-white" : "border border-[#2A2D36] bg-[#0F1115]"}`}><Icon className="size-4" /></span>
                          <span><span className="block text-sm font-semibold">{item.label}</span><span className={`text-xs ${selected ? "text-slate-500" : "text-white/45"}`}>{item.description}</span></span>
                        </span>
                        {selected ? <CheckCircle2 className="size-5" /> : null}
                      </button>
                    );
                  })
                : methods.map((method) => {
                    const Icon = paymentIcon(method.value);
                    const selected = paymentMethod === method.value;
                    return (
                      <button key={method.value} type="button" onClick={() => onPayment(method.value)} className={`${darkButtonClass} flex w-full items-center justify-between border p-3 text-left ${selected ? "border-[#2A2D36] bg-white text-slate-950" : "border-[#2A2D36] bg-[#15171D]"}`}>
                        <span className="flex items-center gap-3"><span className={`${darkButtonClass} flex size-10 items-center justify-center ${selected ? "bg-slate-950 text-white" : "border border-[#2A2D36] bg-[#0F1115]"}`}><Icon className="size-4" /></span><span className="text-sm font-semibold">{method.label}</span></span>
                        {selected ? <CheckCircle2 className="size-5" /> : null}
                      </button>
                    );
                  })}
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function ProfileSheet({
  open,
  onClose,
  customer,
  setCustomer,
  orders,
  businessPhone,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  customer: CustomerDraft;
  setCustomer: React.Dispatch<React.SetStateAction<CustomerDraft>>;
  orders: LocalOrder[];
  businessPhone: string | null;
  currency: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[57]">
          <motion.button type="button" aria-label="Cerrar perfil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" />
          <motion.section initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 330 }} className="absolute bottom-0 left-0 top-0 w-[88vw] max-w-sm overflow-y-auto border-r border-[#2A2D36] bg-[#111318] p-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Tu perfil</p>
                <p className="text-xs text-white/45">Pedidos, datos y soporte</p>
              </div>
              <button type="button" onClick={onClose} className={`${darkButtonClass} flex size-9 items-center justify-center border border-[#2A2D36] bg-[#0F1115]`}><X className="size-4" /></button>
            </div>
            <div className="space-y-2">
              <Input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre" className={`h-11 ${darkFieldClass}`} />
              <Input value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="WhatsApp" className={`h-11 ${darkFieldClass}`} />
              <Input value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} placeholder="Correo" className={`h-11 ${darkFieldClass}`} />
              <Input value={customer.addressReference} onChange={(event) => setCustomer((current) => ({ ...current, addressReference: event.target.value }))} placeholder="Referencia de dirección" className={`h-11 ${darkFieldClass}`} />
            </div>
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold">Pedidos</p>
              <div className="space-y-2">
                {orders.length ? orders.map((order) => (
                  <div key={`${order.code}-${order.createdAt}`} className={`${darkCardClass} p-3`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{order.code}</p>
                      <p className="text-sm font-semibold">{formatPublicMoney(order.total, currency)}</p>
                    </div>
                    <p className="mt-1 text-xs text-white/45">{fulfillmentLabel(order.fulfillment)} · {order.paymentMethod}</p>
                    <Timeline status={order.status} />
                  </div>
                )) : (
                  <div className={`${darkCardClass} p-4 text-sm text-white/45`}>Aún no tienes pedidos guardados en este dispositivo.</div>
                )}
              </div>
            </div>
            <div className={`${darkCardClass} mt-6 p-3`}>
              <div className="flex items-center gap-3">
                <span className={`${darkButtonClass} flex size-10 items-center justify-center bg-white text-slate-950`}><Headphones className="size-4" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Soporte</p>
                  <p className="text-xs text-white/45">{businessPhone ? `WhatsApp ${businessPhone}` : "Contacto del negocio disponible pronto."}</p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function Timeline({ status }: { status: LocalOrder["status"] }) {
  const steps: LocalOrder["status"][] = ["Recibido", "Confirmado", "Preparando", "Listo", "En camino", "Entregado"];
  const currentIndex = steps.indexOf(status);
  return (
    <div className="mt-3 flex items-center gap-1">
      {steps.map((step, index) => (
        <div key={step} className="flex flex-1 items-center gap-1">
          <span className={`flex size-5 items-center justify-center rounded-[6px] text-[9px] ${index <= currentIndex ? "bg-white text-slate-950" : "border border-[#2A2D36] bg-[#0F1115] text-white/35"}`}>
            {index <= currentIndex ? <PackageCheck className="size-3" /> : index + 1}
          </span>
          {index < steps.length - 1 ? <span className={`h-0.5 flex-1 rounded-[6px] ${index < currentIndex ? "bg-white" : "bg-[#2A2D36]"}`} /> : null}
        </div>
      ))}
    </div>
  );
}
