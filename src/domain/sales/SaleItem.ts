import { BaseUnitCode } from '../common/unit/BaseUnit';

export type CostQualitySnapshot = 'REAL' | 'REFERENCE' | 'UNKNOWN';
export type SaleLineType = 'PRODUCT' | 'OPEN_AMOUNT';
export type SaleLineSaleMode = 'UNIT' | 'WEIGHT';

export interface SaleItem {
  id: string;
  businessId: string;
  saleId: string;
  productId?: string | null; // Nullable for OPEN_AMOUNT
  presentationId?: string | null;
  productNameSnapshot: string; // Product name for PRODUCT, custom description for OPEN_AMOUNT
  presentationNameSnapshot?: string | null;
  baseUnit: BaseUnitCode;
  presentationFactor: number;
  lineType?: SaleLineType; // 'PRODUCT' (default) | 'OPEN_AMOUNT'
  saleMode?: SaleLineSaleMode; // 'UNIT' (default) | 'WEIGHT'
  weightGrams?: number | null; // Integer grams if saleMode === 'WEIGHT'
  quantity: number; // Scaled integer (scale: 1000) or 1000 for OPEN_AMOUNT
  inventoryQuantityDelta: number; // Scaled integer (negative for stock deduction, 0 for OPEN_AMOUNT)
  unitPrice: number; // Minor currency integer (price per unit or price per kg)
  discountTotal: number; // Minor currency integer
  lineTotal: number; // Minor currency integer
  unitCostSnapshot?: number | null;
  lineCostTotal?: number | null;
  costQualitySnapshot: CostQualitySnapshot;
  skuSnapshot?: string | null;
  barcodeSnapshot?: string | null;
  createdAt: string;
}
