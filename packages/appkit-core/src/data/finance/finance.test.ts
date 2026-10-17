import { describe, expect, it } from 'vitest';
import { calculateCostFromLayers, type InventoryLayer } from './cost-calculation';

describe('calculateCostFromLayers', () => {
  const sampleLayers: InventoryLayer[] = [
    {
      id: 'L1',
      quantity: 10,
      unitCost: 100,
      totalCost: 1000,
      remainingQuantity: 10,
      receiptDate: 1000,
      orderId: 'PO-01',
    },
    {
      id: 'L2',
      quantity: 20,
      unitCost: 150,
      totalCost: 3000,
      remainingQuantity: 20,
      receiptDate: 2000,
      orderId: 'PO-02',
    },
  ];

  it('calculates cost using FIFO order', () => {
    const result = calculateCostFromLayers(sampleLayers, 15, 'FIFO');
    expect(result.totalCost).toBe(10 * 100 + 5 * 150); // 1750
    expect(result.unitCost).toBe(1750 / 15);
    expect(result.layers).toHaveLength(2);
    expect(result.layers?.[0]).toEqual({ id: 'L1', quantity: 10, unitCost: 100, totalCost: 1000 });
    expect(result.layers?.[1]).toEqual({ id: 'L2', quantity: 5, unitCost: 150, totalCost: 750 });
  });

  it('calculates cost using Weighted Average (WA)', () => {
    const result = calculateCostFromLayers(sampleLayers, 15, 'WA');
    // total available qty = 30, total available cost = 1000 + 3000 = 4000
    // avg unit cost = 4000 / 30 = 133.333...
    expect(result.unitCost).toBeCloseTo(4000 / 30, 4);
    expect(result.totalCost).toBeCloseTo((4000 / 30) * 15, 4);
  });
});
