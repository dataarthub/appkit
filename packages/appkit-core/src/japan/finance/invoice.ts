import { calculateInvoiceAmounts as calculate } from "../../data/finance";
import type { InvoiceAmountsInput, InvoiceAmountsResult, InvoiceCalculationOptions } from "../../data/finance";
export type { InvoiceAmountsInput, InvoiceAmountsResult, InvoiceCalculationOptions } from "../../data/finance";
/** Legacy Japanese application preset, not a determination of the legally applicable tax rate or rounding rule. */
export const JAPANESE_INVOICE_DEFAULTS: InvoiceCalculationOptions = Object.freeze({ defaultTaxRate: 10, roundTax: Math.round });
/** Preserves the previous 10%/Math.round defaults; callers can select another rate and rounding policy. */
export function calculateInvoiceAmounts(input: InvoiceAmountsInput, options: Partial<InvoiceCalculationOptions> = {}): InvoiceAmountsResult {
  return calculate(input, { ...JAPANESE_INVOICE_DEFAULTS, ...options });
}
