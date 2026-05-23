import type { PublicBusinessPaymentMethod, PublicPaymentMethodType, PublicPaymentStatus } from "@/features/public-ordering/types";

export function countryCode(country: string | null) {
  const value = (country ?? "").trim().toLowerCase();
  if (value.includes("venezuela")) return "VE";
  if (value.includes("chile")) return "CL";
  return "US";
}

export function publicCurrency(country: string | null, businessCurrency: string) {
  const code = countryCode(country);
  if (code === "CL") return "CLP";
  if (code === "VE") return "USD";
  return businessCurrency || "USD";
}

export function formatPublicMoney(value: number, currency: string) {
  if (currency === "CLP") {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export type PublicPaymentOption = PublicBusinessPaymentMethod & {
  value: PublicPaymentMethodType;
  label: string;
  paymentStatus: PublicPaymentStatus;
};

export const DEFAULT_PAYMENT_SETTINGS: PublicBusinessPaymentMethod[] = [
  { id: null, type: "CASH", enabled: true, title: "Efectivo", instructions: null, alias: null, phone: null, email: null, qrImage: null },
  { id: null, type: "MOBILE_PAYMENT", enabled: true, title: "Pago movil", instructions: null, alias: null, phone: null, email: null, qrImage: null },
  { id: null, type: "TRANSFER", enabled: true, title: "Transferencia", instructions: null, alias: null, phone: null, email: null, qrImage: null },
  { id: null, type: "ZELLE", enabled: false, title: "Zelle", instructions: null, alias: null, phone: null, email: null, qrImage: null },
  { id: null, type: "BINANCE", enabled: false, title: "Binance", instructions: null, alias: null, phone: null, email: null, qrImage: null },
  { id: null, type: "MERCADO_PAGO", enabled: false, title: "Mercado Pago", instructions: null, alias: null, phone: null, email: null, qrImage: null },
  { id: null, type: "CARD", enabled: false, title: "Tarjetas", instructions: null, alias: null, phone: null, email: null, qrImage: null },
];

export function paymentStatusForType(type: PublicPaymentMethodType): PublicPaymentStatus {
  return type === "CASH" ? "PENDING" : "AWAITING_PAYMENT";
}

export function resolvePaymentOptions(methods: PublicBusinessPaymentMethod[] | null | undefined): PublicPaymentOption[] {
  const configured = Array.isArray(methods) && methods.length > 0 ? methods : DEFAULT_PAYMENT_SETTINGS;
  const active = configured.filter((method) => method.enabled);
  const source = active.length > 0 ? active : DEFAULT_PAYMENT_SETTINGS.filter((method) => method.enabled);

  return source
    .map((method) => ({
      ...method,
      value: method.type,
      label: method.title,
      paymentStatus: paymentStatusForType(method.type),
    }));
}

export function isBusinessOpen(activeDays: string, openTime: string, closeTime: string, now = new Date()) {
  const day = now.getDay();
  const days = activeDays.split(",").map((item) => Number(item.trim()));
  if (!days.includes(day)) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = openTime.split(":").map(Number);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);
  const open = (openHour || 0) * 60 + (openMinute || 0);
  const close = (closeHour || 0) * 60 + (closeMinute || 0);

  if (close < open) return minutes >= open || minutes <= close;
  return minutes >= open && minutes <= close;
}
