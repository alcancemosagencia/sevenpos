import { InventoryMovement } from './InventoryMovement';
import { QUANTITY_SCALE } from '../common/quantity/Quantity';

export type CostQuality = 'REAL' | 'REFERENCE' | 'UNKNOWN';

export interface InventoryCostState {
  currentStock: number; // Scaled integer (scale: 1000)
  inventoryValue: number; // Minor currency integer
  averageUnitCost: number | null; // Minor currency integer
  lastKnownAverageUnitCost: number | null; // Minor currency integer
  costQuality: CostQuality;
}

/**
 * Sequential WAC (Weighted Average Cost) state machine.
 * Evaluates movements in chronological order to compute accurate inventory value and unit cost.
 */
export function calculateSequentialWAC(
  movements: InventoryMovement[],
  catalogRefCost?: number | null
): InventoryCostState {
  // Sort movements chronologically (occurredAt ASC, then createdAt ASC)
  const sorted = [...movements].sort((a, b) => {
    const timeDiff = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  let currentStock = 0; // Scaled units (e.g. 10000 = 10 units)
  let totalValueMicro = 0; // Micro value: minor currency * QUANTITY_SCALE
  let lastKnownAvgMinor: number | null = null;
  let hasRealCostEntry = false;

  for (const m of sorted) {
    const delta = m.quantityDelta;

    if (delta > 0) {
      // INCOMING MOVEMENT
      if (m.totalCost !== undefined && m.totalCost !== null && m.totalCost >= 0) {
        // Incoming with exact totalCost (avoids precision loss on non-divisible presentation bundles)
        const incomingValueMicro = m.totalCost * QUANTITY_SCALE;
        totalValueMicro += incomingValueMicro;
        currentStock += delta;
        hasRealCostEntry = true;
        if (currentStock > 0) {
          lastKnownAvgMinor = Math.round(totalValueMicro / currentStock);
        }
      } else if (m.unitCost !== undefined && m.unitCost !== null && m.unitCost >= 0) {
        // Incoming with explicit unit cost
        const incomingValueMicro = delta * m.unitCost;
        totalValueMicro += incomingValueMicro;
        currentStock += delta;
        hasRealCostEntry = true;
        if (currentStock > 0) {
          lastKnownAvgMinor = Math.round(totalValueMicro / currentStock);
        }
      } else {
        // Incoming without cost (e.g. ADJUSTMENT_IN or ENTRY without cost)
        if (lastKnownAvgMinor !== null && currentStock >= 0) {
          // Inherit current average cost
          const inheritedValueMicro = delta * lastKnownAvgMinor;
          totalValueMicro += inheritedValueMicro;
        }
        currentStock += delta;
      }
    } else if (delta < 0) {
      // OUTGOING MOVEMENT (WASTE, ADJUSTMENT_OUT, etc.)
      const absDelta = Math.abs(delta);
      if (currentStock > 0 && lastKnownAvgMinor !== null) {
        const outgoingValueMicro = Math.min(totalValueMicro, absDelta * lastKnownAvgMinor);
        totalValueMicro = Math.max(0, totalValueMicro - outgoingValueMicro);
      }
      currentStock = Math.max(0, currentStock + delta); // delta is negative
    }

    if (currentStock === 0) {
      totalValueMicro = 0;
    }
  }

  const currentTotalValueMinor = Math.round(totalValueMicro / QUANTITY_SCALE);
  let averageUnitCost: number | null = null;
  let costQuality: CostQuality = 'UNKNOWN';

  if (currentStock > 0 && hasRealCostEntry && lastKnownAvgMinor !== null) {
    averageUnitCost = lastKnownAvgMinor;
    costQuality = 'REAL';
  } else if (catalogRefCost !== undefined && catalogRefCost !== null && catalogRefCost > 0) {
    averageUnitCost = catalogRefCost;
    costQuality = 'REFERENCE';
  }

  return {
    currentStock,
    inventoryValue: currentTotalValueMinor,
    averageUnitCost,
    lastKnownAverageUnitCost: lastKnownAvgMinor,
    costQuality,
  };
}
