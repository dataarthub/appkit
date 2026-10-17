import { test, expect } from 'bun:test';
import { calculateInvoiceAmounts } from './finance/invoice';
import { isPublicHoliday, getWeekdayWithHoliday, formatDate } from './date-utils';
import { CSVGenerator, DEFAULT_CSV_CONFIG } from './csv';
import { createInvoiceExcelWorkbook } from './excel/invoice-template';
import { japaneseDocumentPresets, defaultPdfTheme, mergePdfTheme } from './pdf';
import { createAmount, createTaxId, createFinancials, createInvoice, createParty } from './edi';
test('Japanese invoice defaults remain overridable including rounding and zero tax', () => {
  expect(calculateInvoiceAmounts({ subtotal: 999 }).taxAmount).toBe(100);
  expect(calculateInvoiceAmounts({ subtotal: 999 }, { defaultTaxRate: 8, roundTax: Math.floor }).taxAmount).toBe(79);
  expect(calculateInvoiceAmounts({ subtotal: 1000, taxRate: 0 }).totalAmount).toBe(1000);
});
test('Japanese calendar and weekday suffix use the explicitly chosen date timezone', () => {
  expect(isPublicHoliday('2024-01-01T12:00:00Z', 'Asia/Tokyo')).toBe(true);
  expect(isPublicHoliday('2024-01-02T12:00:00Z', 'Asia/Tokyo')).toBe(false);
  expect(getWeekdayWithHoliday('2024-01-01T12:00:00Z', 'ja-JP', 'Asia/Tokyo')).toBe('月祝');
  expect(formatDate('2024-01-15T12:00:00Z', { timeZone: 'UTC' }, 'en-US')).toBe('1/15/2024');
});
test('Japanese CSV Date preset supports an explicit machine format instead', () => {
  const generate = (csv: CSVGenerator) => csv.generate([{ date: new Date('2024-01-15T12:00:00Z') }], [{ id: 'date' }], [{ columnId: 'date', columnLabel: 'Date', include: true, order: 0 }]);
  expect(generate(new CSVGenerator({ ...DEFAULT_CSV_CONFIG, dateOptions: { timeZone: 'UTC' } }))).toBe('Date\n2024/1/15');
  expect(generate(new CSVGenerator({ ...DEFAULT_CSV_CONFIG, dateFormatter: value => value.toISOString() }))).toContain('2024-01-15T12:00:00.000Z');
});
test('Japanese workbook, approval presets and font name are explicit regional data', () => {
  const workbook = createInvoiceExcelWorkbook({ documentNo: 'I-1', issueDate: '2024-01-15', client: { companyName: 'Client' }, issuer: { companyName: 'Issuer' }, items: [{ name: 'Work', quantity: 1, unitPrice: 1000 }] });
  expect(workbook.sheets[0]?.name).toBe('請求書');
  expect(workbook.sheets[0]?.cells?.some(cell => cell.formula?.includes('0.1'))).toBe(true);
  expect(japaneseDocumentPresets.invoice.title).toContain('請');
  expect(defaultPdfTheme.fontFamily).toBe('NotoSansJP');
  expect(mergePdfTheme()).toBe(defaultPdfTheme);
});
test('EDI regional defaults delegate generic construction and allow an explicit target currency/profile', () => {
  expect(createAmount(1).currency).toBe('JPY');
  const party = createParty(createTaxId('T1234567890123'), 'Supplier');
  const invoice = createInvoice('I-1', '2024-01-15', party, party, [], createFinancials([], 0, 'USD'), { currency: 'USD', customizationId: 'application:profile' });
  expect(invoice.currency).toBe('USD'); expect(invoice.customization_id).toBe('application:profile');
});
