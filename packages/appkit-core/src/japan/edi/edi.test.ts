import { describe, expect, it } from 'bun:test';
import { validateEdiDocument } from './validator';
import {
  createInvoice,
  createParty,
  createLine,
  createTaxSubtotal,
  createTaxCategory,
  createAmount,
  createTaxId,
} from './factory';

describe('EDI Document & JP PINT Validator', () => {
  it('validates represented Japanese fields using VAT tax identity', () => {
    const seller = createParty(
      createTaxId('T1234567890123'),
      '株式会社サプライヤー',
      {
        taxId: createTaxId('T1234567890123'),
        address: {
          street_name: '千代田区1-1',
          city: '千代田区',
          postal_zone: '100-0001',
          country: 'JP',
        },
      },
    );

    const buyer = createParty(
      createTaxId('T9876543210987'),
      '株式会社バイヤー',
      {
        taxId: createTaxId('T9876543210987'),
        address: {
          street_name: '中央区2-2',
          city: '中央区',
          postal_zone: '103-0001',
          country: 'JP',
        },
      },
    );

    const line = createLine(
      '1',
      'クラウド開発サービス',
      1,
      'EA',
      10000,
      {
        taxCategory: createTaxCategory('S', 10),
      },
    );

    const taxCategory10 = createTaxCategory('S', 10);
    const taxSubtotal = createTaxSubtotal(10000, 1000, taxCategory10);

    const financials = {
      line_extension_amount: createAmount(10000),
      tax_exclusive_amount: createAmount(10000),
      tax_inclusive_amount: createAmount(11000),
      payable_amount: createAmount(11000),
      tax_total: {
        tax_amount: createAmount(1000),
        tax_subtotals: [taxSubtotal],
      },
    };

    const invoice = createInvoice(
      'INV-2026-001',
      '2026-10-15',
      seller,
      buyer,
      [line],
      financials,
    );

    const result = validateEdiDocument(invoice);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('detects missing required fields and invalid PINT rules', () => {
    // Empty / incomplete document
    const brokenDoc: any = {
      id: '',
      type: 'Invoice',
      issue_date: '',
      seller: { name: '' },
      buyer: { name: '' },
      lines: [],
      financials: {
        line_extension_amount: { value: 0, currency: 'JPY' },
        tax_exclusive_amount: { value: 0, currency: 'JPY' },
        tax_inclusive_amount: { value: undefined, currency: 'JPY' },
        payable_amount: { value: 0, currency: 'JPY' },
        tax_total: { tax_amount: { value: 0, currency: 'JPY' }, tax_subtotals: [] },
      },
    };

    const result = validateEdiDocument(brokenDoc);
    expect(result.valid).toBe(false);
    const errorCodes = result.issues.map((i) => i.code);
    expect(errorCodes).toContain('PINT-001'); // Missing ID
    expect(errorCodes).toContain('PINT-002'); // Missing Issue Date
    expect(errorCodes).toContain('PINT-003'); // Missing Currency
    expect(errorCodes).toContain('PINT-004'); // Missing Schema Version
    expect(errorCodes).toContain('PINT-010'); // Missing Supplier
    expect(errorCodes).toContain('PINT-045'); // Missing Tax Inclusive Amount
  });
});
