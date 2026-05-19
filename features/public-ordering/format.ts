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

export function paymentOptions(country: string | null) {
  if (countryCode(country) === "CL") {
    return [
      { value: "cash", label: "Efectivo" },
      { value: "transfer", label: "Transferencia" },
      { value: "debit", label: "Debito" },
      { value: "credit", label: "Credito" },
    ] as const;
  }

  return [
    { value: "cash", label: "Efectivo" },
    { value: "mobile_payment", label: "Pago movil" },
    { value: "zelle", label: "Zelle" },
    { value: "binance", label: "Binance" },
    { value: "transfer", label: "Transferencia" },
  ] as const;
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
