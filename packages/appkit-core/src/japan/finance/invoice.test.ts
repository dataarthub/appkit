import { describe, expect, it } from 'bun:test';
import { calculateInvoiceAmounts } from './invoice';

describe('calculateInvoiceAmounts', () => {
  it.each([undefined, null, '', '  ', 'invalid', NaN, Infinity])(
    'uses defaults and calculated amounts for unset/invalid input %s',
    (value) => {
      expect(
        calculateInvoiceAmounts({
          subtotal: 1000,
          taxRate: value,
          taxAmount: value,
          totalAmount: value,
        }),
      ).toEqual({ subtotal: 1000, taxRate: 10, taxAmount: 100, totalAmount: 1100 });
    },
  );

  it.each([0, '0'])('preserves an explicit zero tax rate: %s', (taxRate) => {
    expect(calculateInvoiceAmounts({ subtotal: 1000, taxRate })).toEqual({
      subtotal: 1000,
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 1000,
    });
  });

  it.each([0, '0'])('preserves an explicit zero tax amount: %s', (taxAmount) => {
    expect(calculateInvoiceAmounts({ subtotal: 1000, taxAmount })).toEqual({
      subtotal: 1000,
      taxRate: 10,
      taxAmount: 0,
      totalAmount: 1000,
    });
  });

  it.each([0, '0'])('preserves an explicit zero total: %s', (totalAmount) => {
    expect(calculateInvoiceAmounts({ subtotal: 1000, totalAmount })).toEqual({
      subtotal: 1000,
      taxRate: 10,
      taxAmount: 100,
      totalAmount: 0,
    });
  });

  it('supports numeric strings and rounds calculated tax', () => {
    expect(
      calculateInvoiceAmounts({ subtotal: 999, taxRate: '8', taxAmount: null, totalAmount: '' }),
    ).toEqual({ subtotal: 999, taxRate: 8, taxAmount: 80, totalAmount: 1079 });
  });

  it('preserves overrides independently', () => {
    expect(
      calculateInvoiceAmounts({
        subtotal: 1000,
        taxRate: null,
        taxAmount: '25',
        totalAmount: null,
      }),
    ).toEqual({ subtotal: 1000, taxRate: 10, taxAmount: 25, totalAmount: 1025 });
    expect(
      calculateInvoiceAmounts({ subtotal: 1000, taxAmount: '', totalAmount: '900' }).totalAmount,
    ).toBe(900);
  });
});

