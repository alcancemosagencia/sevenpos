export type PosProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  priceUsd: number;
  priceBs: number;
  stock: number;
  lowStockAlert: number;
  sku: string | null;
  barcode: string | null;
  allowVariablePrice: boolean;
  soldByWeight: boolean;
  unit: "UNIT" | "KG" | "GR" | "LT" | "ML" | "MT";
  isActive: boolean;
  isPublic: boolean;
};

export type ProductCategory = {
  id: string;
  name: string;
};

export type CartItem = {
  productId: string;
  name: string;
  imageUrl: string | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitPriceUsd: number;
  unitPriceBs: number;
  stock: number;
};

export type PaymentMethod = "CASH_USD" | "CASH_BS" | "MOBILE_PAYMENT" | "BANK_TRANSFER";

export type TenderMode = PaymentMethod | "MIXED";

export type PosPreSale = {
  id: string;
  code: string;
  totalUsd: number;
  createdBy: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};
