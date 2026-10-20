import { calculateInvoiceAmounts as calculate } from "../../data/finance";
import type { InvoiceAmountsInput, InvoiceAmountsResult, InvoiceCalculationOptions } from "../../data/finance";
export type { InvoiceAmountsInput, InvoiceAmountsResult, InvoiceCalculationOptions } from "../../data/finance";
/**
 * Legacy Japanese application preset, not a determination of the legally applicable tax rate or rounding rule.
 *
 * @see {@link calculateInvoiceAmounts} for default and override usage.
 */
export const JAPANESE_INVOICE_DEFAULTS: InvoiceCalculationOptions = Object.freeze({ defaultTaxRate: 10, roundTax: Math.round });
/**
 * Preserves the previous 10%/Math.round defaults; callers can select another rate and rounding policy.
 *
 * @param input - Subtotal and optional explicit tax rate/amount/total; explicit zero values are retained.
 * @param options - Overrides for the 10 percentage-point rate and Math.round tax callback; defaults to {}.
 * @returns Finite subtotal, percentage-point rate, tax and total using JavaScript number arithmetic.
 * @throws Throws nonfinite required inputs/calculated amounts or an invalid rounding callback; callback errors propagate.
 *
 * @example
 * ```typescript
 * import { calculateInvoiceAmounts } from '@alneas/appkit-core/japan/finance/invoice';
 *
 * console.log(calculateInvoiceAmounts({ subtotal: 1000 }));
 * ```
 */
export function calculateInvoiceAmounts(input: InvoiceAmountsInput, options: Partial<InvoiceCalculationOptions> = {}): InvoiceAmountsResult {
  return calculate(input, { ...JAPANESE_INVOICE_DEFAULTS, ...options });
}
