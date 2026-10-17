import { test, expect } from 'bun:test';
import { calculateInvoiceAmounts } from './invoice';
test('tax rate and rounding are caller-selected, with explicit zero overrides preserved', () => {
  expect(calculateInvoiceAmounts({ subtotal: 999 }, { defaultTaxRate: 8, roundTax: Math.floor }).taxAmount).toBe(79);
  expect(calculateInvoiceAmounts({ subtotal: 999 }, { defaultTaxRate: 8, roundTax: Math.round }).taxAmount).toBe(80);
  expect(calculateInvoiceAmounts({ subtotal: 100, taxRate: 0, totalAmount: 0 }, { defaultTaxRate: 21, roundTax: Math.floor })).toEqual({ subtotal: 100, taxRate: 0, taxAmount: 0, totalAmount: 0 });
  expect(() => calculateInvoiceAmounts({ subtotal: NaN }, { defaultTaxRate: 0, roundTax: Math.floor })).toThrow('Finite');
});
