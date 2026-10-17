export type CostMethod = 'LIFO' | 'FIFO' | 'WA' | 'STANDARD';

/**
 * Interface representing the cost calculation result.
 */
export interface CostCalculationResult {
  /** Calculated unit cost */
  unitCost: number;
  /** Calculated total cost */
  totalCost: number;
  /** Cost valuation method used */
  method: CostMethod;
  /** Source of cost calculation ('project': inventory layer, 'standard': standard cost) */
  source: 'project' | 'standard';
  /** Detailed list of inventory layers used in the calculation */
  layers?: Array<{
    id: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
}

/**
 * Interface representing inventory layer information.
 */
export interface InventoryLayer {
  /** Unique identifier (ID) for the layer */
  id: string;
  /** Total quantity received */
  quantity: number;
  /** Received quantity (string or number, for raw DB value compatibility) */
  quantityReceived?: number | string;
  /** Unit cost of this layer upon receipt */
  unitCost: number;
  /** Total cost of this layer */
  totalCost: number;
  /** Remaining quantity available for allocation */
  remainingQuantity: number;
  /** Remaining quantity (string or number, for raw DB value compatibility) */
  quantityRemaining?: number | string;
  /** Receipt date (millisecond timestamp or null) */
  receiptDate: number | null;
  /** Associated purchase order ID, if any */
  orderId: string | null;
}

/**
 * Calculates cost from inventory layer information based on the specified valuation method (LIFO / FIFO / Weighted Average / Standard).
 *
 * @param layers Array of inventory layers. For LIFO/FIFO, layers must be pre-sorted in application order (oldest first for FIFO, newest first for LIFO).
 * @param requestedQuantity Requested quantity for cost calculation
 * @param method Cost valuation method ('LIFO' | 'FIFO' | 'WA' | 'STANDARD')
 * @returns Object containing the calculation results
 */
export function calculateCostFromLayers(
  layers: InventoryLayer[],
  requestedQuantity: number,
  method: CostMethod,
): CostCalculationResult {
  const remainingQuantity = requestedQuantity;
  let totalCost = 0;
  const usedLayers: Array<{
    id: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }> = [];

  if (method === 'WA') {
    // Weighted Average (WA): Calculate average unit cost across all available layers
    const totalAvailableQuantity = layers.reduce((sum, layer) => sum + layer.remainingQuantity, 0);
    const totalAvailableCost = layers.reduce(
      (sum, layer) => sum + layer.remainingQuantity * layer.unitCost,
      0,
    );

    const averageUnitCost =
      totalAvailableQuantity > 0 ? totalAvailableCost / totalAvailableQuantity : 0;

    return {
      unitCost: averageUnitCost,
      totalCost: averageUnitCost * requestedQuantity,
      method: 'WA',
      source: 'project',
      layers: [
        {
          id: 'WA',
          quantity: requestedQuantity,
          unitCost: averageUnitCost,
          totalCost: averageUnitCost * requestedQuantity,
        },
      ],
    };
  }

  // FIFO/LIFO: Process layers in specified order
  let tempRemaining = remainingQuantity;
  for (const layer of layers) {
    if (tempRemaining <= 0) break;

    const useQuantity = Math.min(tempRemaining, layer.remainingQuantity);
    const layerCost = useQuantity * layer.unitCost;

    totalCost += layerCost;
    tempRemaining -= useQuantity;

    usedLayers.push({
      id: layer.id,
      quantity: useQuantity,
      unitCost: layer.unitCost,
      totalCost: layerCost,
    });
  }

  const unitCost = requestedQuantity > 0 ? totalCost / requestedQuantity : 0;

  return {
    unitCost,
    totalCost,
    method,
    source: 'project',
    layers: usedLayers,
  };
}
