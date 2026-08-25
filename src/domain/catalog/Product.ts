import { BaseUnitCode } from '../common/unit/BaseUnit';

export interface Product {
  id: string;
  businessId: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  baseUnit: BaseUnitCode;
  salePrice: number; // Integer minor units (e.g. 12500 CLP, 1250 cents USD)
  costPrice?: number | null; // Reference cost in integer minor units
  minimumStock?: number | null; // Threshold reference for future inventory
  imagePath?: string | null;
  featured: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function normalizeSku(sku?: string | null): string | null {
  if (!sku || !sku.trim()) return null;
  return sku.trim().toUpperCase();
}

export function normalizeBarcode(barcode?: string | null): string | null {
  if (!barcode || !barcode.trim()) return null;
  // Preserve leading zeros and case/format, only trim whitespace
  return barcode.trim();
}

export function validateProduct(product: Partial<Product>): { isValid: boolean; error?: string } {
  if (!product.businessId || !product.businessId.trim()) {
    return { isValid: false, error: 'El identificador de negocio es obligatorio.' };
  }
  if (!product.name || !product.name.trim()) {
    return { isValid: false, error: 'El nombre del producto es obligatorio.' };
  }
  if (product.name.trim().length > 150) {
    return { isValid: false, error: 'El nombre del producto no puede superar los 150 caracteres.' };
  }
  if (product.salePrice === undefined || product.salePrice === null || product.salePrice < 0) {
    return { isValid: false, error: 'El precio de venta debe ser un número igual o mayor a cero.' };
  }
  if (product.costPrice !== undefined && product.costPrice !== null && product.costPrice < 0) {
    return { isValid: false, error: 'El costo de referencia no puede ser negativo.' };
  }
  if (product.minimumStock !== undefined && product.minimumStock !== null && product.minimumStock < 0) {
    return { isValid: false, error: 'El stock mínimo no puede ser negativo.' };
  }
  return { isValid: true };
}
