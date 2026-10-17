import { expect, test } from 'bun:test';
import { createUSBusinessDocument, createUSDocumentTemplate, US_LETTER_PAGE } from './index';
import type { USBusinessDocumentInput } from './index';
const input = (): USBusinessDocumentInput => ({
  documentType: 'invoice', documentNo: 'INV-100', issueDate: '2026-10-19', dueDate: '2026-11-18',
  issuer: { companyName: 'Example Studio', address: '100 Example Street' },
  client: { companyName: 'Example Client', address: '200 Example Avenue' },
  items: [{ name: 'Design', quantity: 2, unitCode: 'hour', unitPrice: 50, amount: 100 }],
  taxPolicy: { defaultTaxRate: 5, roundTax: amount => Math.round(amount * 100) / 100 },
  paymentTerms: 'Net 30', paymentInstructions: 'Use the payment details supplied by the issuer.',
});
test('invoice model combines English labels, explicit tax policy, US Letter and independent data', () => {
  const source = input();
  const result = createUSBusinessDocument(source);
  expect(result.page).toEqual({ width: 612, height: 792, margin: 36 });
  expect(Object.isFrozen(US_LETTER_PAGE)).toBe(true);
  expect(result.presentation.total).toBe('$105.00');
  expect(result.presentation.tax).toBe('$5.00');
  expect(result.presentation.dueDate).toBe('11/18/2026');
  expect(result.data.invoiceDate).toBe('2026-10-19');
  expect(result.data.paymentTerms).toBe('Net 30');
  expect(result.template.showStaffSeal).toBe(false);
  expect(result.template.tableConfig.columns?.map(c => c.header)).toEqual(['Description','Quantity','Unit Price (USD)','Amount (USD)']);
  expect(result.data.items[0]).not.toBe(source.items[0]);
  expect(result.issuer).not.toBe(source.issuer);
});
test('quotes and credit notes have distinct dates, references and positive credit magnitudes', () => {
  const quote = createUSBusinessDocument({ ...input(), documentType: 'quote', expirationDate: '2026-10-31' });
  expect(quote.data.quoteDate).toBe('2026-10-19');
  expect(quote.presentation.expirationDate).toBe('10/31/2026');
  expect(quote.presentation.clientLabel).toBe('Prepared For');
  expect(() => createUSBusinessDocument({ ...input(), documentType: 'creditNote' })).toThrow(TypeError);
  const credit = createUSBusinessDocument({ ...input(), documentType: 'creditNote', billingReference: 'INV-099' });
  expect(credit.presentation.totalLabel).toBe('Credit Total (USD)');
  expect(credit.amounts.totalAmount).toBe(105);
  expect(credit.data.billingReference).toBe('INV-099');
});
test('zero tax, zero lines and precomputed discounted line amounts are preserved', () => {
  expect(createUSBusinessDocument({ ...input(), items: [], taxPolicy: { defaultTaxRate: 0, roundTax: Math.round } }).presentation.total).toBe('$0.00');
  const discounted = input(); discounted.items = [{ ...discounted.items[0]!, amount: 90 }];
  expect(createUSBusinessDocument(discounted).amounts.subtotal).toBe(90);
  const a = createUSDocumentTemplate('invoice'); a.tableConfig.columns![0]!.header = 'Changed';
  expect(createUSDocumentTemplate('invoice').tableConfig.columns![0]!.header).toBe('Description');
});
test('invalid civil dates, amounts, required fields and rounder outputs fail', () => {
  expect(() => createUSBusinessDocument({ ...input(), issueDate: '2026-02-30' })).toThrow(RangeError);
  expect(() => createUSBusinessDocument({ ...input(), dueDate: 'invalid' })).toThrow(RangeError);
  expect(() => createUSBusinessDocument({ ...input(), documentNo: '' })).toThrow(TypeError);
  expect(() => createUSBusinessDocument({ ...input(), issuer: { companyName: '', address: 'Example' } })).toThrow(TypeError);
  for (const amount of [-1, NaN, Infinity]) expect(() => createUSBusinessDocument({ ...input(), items: [{ ...input().items[0]!, amount }] })).toThrow(RangeError);
  expect(() => createUSBusinessDocument({ ...input(), taxPolicy: { defaultTaxRate: -1, roundTax: Math.round } })).toThrow(RangeError);
  expect(() => createUSBusinessDocument({ ...input(), taxPolicy: { defaultTaxRate: 5, roundTax: () => -1 } })).toThrow(RangeError);
  expect(() => createUSBusinessDocument({ ...input(), taxPolicy: { defaultTaxRate: 5, roundTax: () => Infinity } })).toThrow();
});
