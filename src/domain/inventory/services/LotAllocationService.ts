/**
 * Deterministic FEFO & Unallocated-First Lot Allocation Engine (AG-06 Core).
 *
 * Consumption Policy:
 * 1. Unallocated stock (lotId = null) is consumed first.
 * 2. Eligible lots with expiration dates (sorted ascending by expiration date, then created_at, then id).
 * 3. Eligible lots without expiration dates (sorted ascending by created_at, then id).
 *
 * Guarantees:
 * - Deterministic, reproducible stock consumption across all transactions.
 * - Single sale item can split across unallocated and multiple lots.
 * - Strict check preventing negative stock across all chunks.
 */

export interface LotStockInfo {
  id: string;
  lotCode?: string | null;
  expirationDate?: string | null;
  currentStock: number; // Scaled integer (only lots with currentStock > 0 are eligible)
  createdAt: string;
}

export interface LotAllocationChunk {
  lotId: string | null;
  quantity: number; // Scaled integer (positive allocated quantity to deduct)
}

export interface LotAllocationResult {
  success: boolean;
  allocations: LotAllocationChunk[];
  error?: string;
}

export function allocateStockForSale(
  requiredQuantity: number,
  unallocatedStock: number,
  lots: LotStockInfo[]
): LotAllocationResult {
  if (!Number.isSafeInteger(requiredQuantity) || requiredQuantity <= 0) {
    return {
      success: false,
      allocations: [],
      error: `Cantidad requerida inválida: ${requiredQuantity}`,
    };
  }

  // Calculate total available stock across unallocated and eligible lots
  const eligibleLots = lots.filter((l) => Number.isSafeInteger(l.currentStock) && l.currentStock > 0);
  const totalLotStock = eligibleLots.reduce((sum, l) => sum + l.currentStock, 0);
  const totalAvailable = Math.max(0, unallocatedStock) + totalLotStock;

  if (totalAvailable < requiredQuantity) {
    return {
      success: false,
      allocations: [],
      error: `Stock insuficiente: disponible ${totalAvailable}, requerido ${requiredQuantity}`,
    };
  }

  const allocations: LotAllocationChunk[] = [];
  let remainingNeeded = requiredQuantity;

  // 1. Consume unallocated stock first
  if (unallocatedStock > 0 && remainingNeeded > 0) {
    const consumeUnallocated = Math.min(unallocatedStock, remainingNeeded);
    allocations.push({
      lotId: null,
      quantity: consumeUnallocated,
    });
    remainingNeeded -= consumeUnallocated;
  }

  if (remainingNeeded <= 0) {
    return { success: true, allocations };
  }

  // 2. Sort eligible lots by FEFO
  // - Lots with expirationDate first (expirationDate ASC, createdAt ASC, id ASC)
  // - Lots without expirationDate next (createdAt ASC, id ASC)
  const sortedLots = [...eligibleLots].sort((a, b) => {
    const aHasExp = Boolean(a.expirationDate);
    const bHasExp = Boolean(b.expirationDate);

    if (aHasExp && bHasExp) {
      const expDiff = a.expirationDate!.localeCompare(b.expirationDate!);
      if (expDiff !== 0) return expDiff;
      const createdDiff = a.createdAt.localeCompare(b.createdAt);
      if (createdDiff !== 0) return createdDiff;
      return a.id.localeCompare(b.id);
    }

    if (aHasExp && !bHasExp) return -1; // Lots with expiration go first
    if (!aHasExp && bHasExp) return 1;

    // Both have no expiration date
    const createdDiff = a.createdAt.localeCompare(b.createdAt);
    if (createdDiff !== 0) return createdDiff;
    return a.id.localeCompare(b.id);
  });

  // 3. Consume sorted lots
  for (const lot of sortedLots) {
    if (remainingNeeded <= 0) break;
    const consumeFromLot = Math.min(lot.currentStock, remainingNeeded);
    allocations.push({
      lotId: lot.id,
      quantity: consumeFromLot,
    });
    remainingNeeded -= consumeFromLot;
  }

  if (remainingNeeded > 0) {
    return {
      success: false,
      allocations: [],
      error: `No se pudo asignar la totalidad del stock requerido (faltaron ${remainingNeeded} unidades)`,
    };
  }

  return {
    success: true,
    allocations,
  };
}
