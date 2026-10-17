import { test, expect } from 'bun:test';
import { formatDate, isPublicHoliday } from './date-utils';
import { CSVGenerator, DEFAULT_CSV_CONFIG } from './csv';
import { createInvoice, createParty, createIdentifier, createLine, createFinancials } from './edi';
test('date/calendar and CSV formatting use explicit application policies', () => {
  const date = new Date('2024-01-15T12:00:00Z');
  expect(formatDate(date, { timeZone: 'UTC' }, 'en-US')).toBe('1/15/2024');
  expect(isPublicHoliday(date, ({ day }) => day === 15, 'UTC')).toBe(true);
  const csv = new CSVGenerator({ ...DEFAULT_CSV_CONFIG, dateFormatter: value => value.toISOString().slice(0, 10) });
  expect(csv.generate([{ date }], [{ id: 'date' }], [{ columnId: 'date', columnLabel: 'Date', include: true, order: 0 }])).toBe('Date\n2024-01-15');
});
test('generic EDI accepts non-Japanese currency and has no inferred profile', () => {
  const party = createParty(createIdentifier('custom', 'supplier'), 'Supplier');
  const invoice = createInvoice('I-1', '2024-01-15', party, party, [createLine('1', 'Service', 1, 'C62', 5)], createFinancials([], 0, 'USD'), { currency: 'USD' });
  expect(invoice.currency).toBe('USD'); expect(invoice.profile_id).toBeUndefined(); expect(invoice.customization_id).toBeUndefined();
});
