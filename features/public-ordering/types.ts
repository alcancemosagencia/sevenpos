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
  categories: PublicMenuCategory[];
  products: PublicMenuProduct[];
};

export type PublicCartItem = PublicMenuProduct & {
  quantity: number;
};

export type FulfillmentMethod = "DELIVERY" | "PICKUP" | "DINE_IN";

export type PublicPaymentMethod =
  | "cash"
  | "transfer"
  | "mobile_payment"
  | "zelle"
  | "binance"
  | "debit"
  | "credit";

export type PublicStoreMode = "ecommerce" | "menu_only";

export function resolvePublicStoreMode(settings: PublicBusinessSettings): PublicStoreMode {
  return settings.deliveryEnabled || settings.pickupEnabled ? "ecommerce" : "menu_only";
}
