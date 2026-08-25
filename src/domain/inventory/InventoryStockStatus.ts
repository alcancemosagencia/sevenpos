export type InventoryStockStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function deriveStockStatus(
  currentStock: number,
  minimumStock?: number | null
): InventoryStockStatus {
  if (currentStock <= 0) {
    return 'OUT_OF_STOCK';
  }

  if (minimumStock !== null && minimumStock !== undefined && minimumStock > 0) {
    if (currentStock <= minimumStock) {
      return 'LOW_STOCK';
    }
  }

  return 'AVAILABLE';
}
