/** Numeric invoice input. Null/empty/invalid optional values are treated as unspecified; explicit zero is preserved. */
export interface InvoiceAmountsInput {
  subtotal: number;
  /** Percentage points, e.g. 20 means 20%. No regional rate is inferred. */
  taxRate?: number | string | null;
  taxAmount?: number | string | null;
  totalAmount?: number | string | null;
}
export interface InvoiceAmountsResult { subtotal: number; taxRate: number; taxAmount: number; totalAmount: number }
/** Application-selected calculation policy. Currency/minor-unit and statutory rules remain caller-owned. */
export interface InvoiceCalculationOptions {
  defaultTaxRate: number;
  /** Rounds the computed tax; for example Math.floor, Math.round, or a decimal/minor-unit adapter. */
  roundTax: (amount: number) => number;
}
function optionalNumber(value: number | string | null | undefined): number | undefined {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return undefined;
  const number = Number(value); return Number.isFinite(number) ? number : undefined;
}
/**
 * Calculates invoice amounts using an explicit tax and rounding policy.
 * Uses JavaScript number arithmetic; inject a decimal rounding strategy or a separate
 * decimal calculation service when exact monetary arithmetic is required.
 * @example calculateInvoiceAmounts({ subtotal: 999 }, { defaultTaxRate: 20, roundTax: Math.floor })
 */
export function calculateInvoiceAmounts(input: InvoiceAmountsInput, options: InvoiceCalculationOptions): InvoiceAmountsResult {
  if (!Number.isFinite(input.subtotal) || !Number.isFinite(options.defaultTaxRate) || typeof options.roundTax !== 'function') throw new Error('Finite subtotal/default tax rate and an explicit tax rounder are required');
  const taxRate = optionalNumber(input.taxRate) ?? options.defaultTaxRate;
  const taxAmount = optionalNumber(input.taxAmount) ?? options.roundTax(input.subtotal * taxRate / 100);
  const totalAmount = optionalNumber(input.totalAmount) ?? input.subtotal + taxAmount;
  if (!Number.isFinite(taxAmount) || !Number.isFinite(totalAmount)) throw new Error('Invoice amounts must be finite');
  return { subtotal: input.subtotal, taxRate, taxAmount, totalAmount };
}
