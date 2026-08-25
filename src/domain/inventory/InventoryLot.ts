export interface InventoryLot {
  id: string;
  businessId: string;
  productId: string;
  lotCode?: string | null;
  expirationDate?: string | null; // YYYY-MM-DD
  createdAt: string; // ISO String UTC
  updatedAt: string; // ISO String UTC
}

export interface InventoryLotWithStock extends InventoryLot {
  currentStock: number; // Scaled integer derived from SUM(movements WHERE lot_id = id)
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED';
}
