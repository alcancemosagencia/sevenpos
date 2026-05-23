export type PublicMenuProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  price: number;
  stock: number;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
};

export type PublicBusinessSettings = {
  coverImageUrl: string | null;
  logoUrl: string | null;
  rating: number;
  distanceLabel: string;
  etaLabel: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
  openTime: string;
  closeTime: string;
  activeDays: string;
  deliveryFee: number;
  taxRate: number;
  termsUrl: string | null;
};

export type PublicPaymentMethodType =
  | "CASH"
  | "MOBILE_PAYMENT"
  | "TRANSFER"
  | "ZELLE"
  | "BINANCE"
  | "MERCADO_PAGO"
  | "CARD";

export type PublicPaymentStatus = "PENDING" | "CONFIRMED" | "AWAITING_PAYMENT";

export type PublicBusinessPaymentMethod = {
  id: string | null;
  type: PublicPaymentMethodType;
  enabled: boolean;
  title: string;
  instructions: string | null;
  alias: string | null;
  phone: string | null;
  email: string | null;
  qrImage: string | null;
};

export type PublicBusiness = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  exchangeRate: number;
  businessType: "COMMERCE" | "RESTAURANT";
  settings: PublicBusinessSettings;
  paymentMethods: PublicBusinessPaymentMethod[];
  categories: PublicMenuCategory[];
  products: PublicMenuProduct[];
};

export type PublicCartItem = PublicMenuProduct & {
  quantity: number;
};

export type FulfillmentMethod = "DELIVERY" | "PICKUP" | "DINE_IN";

export type PublicPaymentMethod = PublicPaymentMethodType;

export type PublicStoreMode = "ecommerce" | "menu_only";

export function resolvePublicStoreMode(settings: PublicBusinessSettings): PublicStoreMode {
  return settings.deliveryEnabled || settings.pickupEnabled ? "ecommerce" : "menu_only";
}
