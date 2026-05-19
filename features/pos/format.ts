export function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(value);
}

export function decimalToNumber(value: { toString(): string }) {
  return Number(value.toString());
}
