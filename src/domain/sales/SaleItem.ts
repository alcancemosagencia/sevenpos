import { BaseUnitCode } from '../common/unit/BaseUnit';

export type CostQualitySnapshot = 'REAL' | 'REFERENCE' | 'UNKNOWN';

export interface SaleItem {
  id: string;
  businessId: string;
  saleId: string;
  productId: string;
  presentationId?: string | null;
  productNameSnapshot: string;
  presentationNameSnapshot?: string | null;
  baseUnit: BaseUnitCode;
  presentationFactor: number;
  quantity: number; // Scaled integer (scale: 1000)
  inventoryQuantityDelta: number; // Scaled integer (negative)
  unitPrice: number; // Minor currency integer
  discountTotal: number; // Minor currency integer
  lineTotal: number; // Minor currency integer
  unitCostSnapshot?: number | null;
  lineCostTotal?: number | null;
  costQualitySnapshot: CostQualitySnapshot;
  skuSnapshot?: string | null;
  barcodeSnapshot?: string | null;
  createdAt: string;
}
