/** US presentation settings; currency does not imply a tax policy or timezone. */
export const US_BUSINESS_DEFAULTS = Object.freeze({ locale: 'en-US', currency: 'USD' } as const);

/**
 * Formats a finite USD amount in dollars using en-US and two fractional digits.
 * Presentation uses Intl rounding, not an accounting calculation or currency conversion.
 * @param amount Amount in dollars (1.25 means $1.25), including negative credits.
 * @returns Localized currency text.
 * @throws RangeError for NaN or infinite amounts.
 * @example
 * import { formatUSD } from '@alneas/appkit-core/us/format';
 * formatUSD(1234.5); // '$1,234.50'
 */
export function formatUSD(amount: number): string {
  if (!Number.isFinite(amount)) throw new RangeError('USD amount must be finite');
  return new Intl.NumberFormat(US_BUSINESS_DEFAULTS.locale, { style: 'currency', currency: US_BUSINESS_DEFAULTS.currency }).format(amount);
}

/**
 * Formats an instant as an en-US numeric date in an explicitly selected timezone.
 * The United States has multiple timezones; this API has no host-local default.
 * @param date Valid Date representing an instant; civil date strings are not accepted.
 * @param timeZone Intl timezone identifier, for example America/New_York or UTC.
 * @returns Month/day/year text in the supplied timezone.
 * @throws RangeError for an invalid Date or timezone; TypeError if timezone is absent.
 * @example
 * import { formatUSDate } from '@alneas/appkit-core/us/format';
 * formatUSDate(new Date('2026-07-04T02:00:00Z'), 'America/New_York'); // '7/3/2026'
 */
export function formatUSDate(date: Date, timeZone: string): string {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new RangeError('A valid Date instant is required');
  if (typeof timeZone !== 'string' || !timeZone.trim()) throw new TypeError('An explicit timezone is required');
  return new Intl.DateTimeFormat(US_BUSINESS_DEFAULTS.locale, { year: 'numeric', month: 'numeric', day: 'numeric', timeZone }).format(date);
}
