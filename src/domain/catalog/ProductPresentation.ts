export interface ProductPresentation {
  id: string;
  businessId: string;
  productId: string;
  name: string;
  description?: string | null;
  unitFactor: number; // Positive integer multiplier of base unit (e.g. 6 for Pack x6)
  salePrice: number; // Integer minor units (e.g. 5500 CLP)
  sku?: string | null;
  barcode?: string | null;
  imagePath?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function validateProductPresentation(presentation: Partial<ProductPresentation>): { isValid: boolean; error?: string } {
  if (!presentation.businessId || !presentation.businessId.trim()) {
    return { isValid: false, error: 'El identificador de negocio es obligatorio.' };
  }
  if (!presentation.productId || !presentation.productId.trim()) {
    return { isValid: false, error: 'El identificador del producto base es obligatorio.' };
  }
  if (!presentation.name || !presentation.name.trim()) {
    return { isValid: false, error: 'El nombre de la presentación es obligatorio.' };
  }
  if (!presentation.unitFactor || presentation.unitFactor <= 0 || !Number.isInteger(presentation.unitFactor)) {
    return { isValid: false, error: 'El factor de conversión debe ser un número entero positivo mayor a 0 (ej. 6, 12, 24).' };
  }
  if (presentation.salePrice === undefined || presentation.salePrice === null || presentation.salePrice < 0) {
    return { isValid: false, error: 'El precio de venta de la presentación debe ser igual o mayor a cero.' };
  }
  return { isValid: true };
}
