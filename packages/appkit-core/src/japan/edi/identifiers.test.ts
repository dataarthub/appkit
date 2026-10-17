import {test,expect} from 'bun:test';
import * as standard from './index';
test('Japanese endpoint identifiers are distinct from VAT tax identity and legacy data',()=>{
  expect(standard.createQualifiedInvoicePartyId('T1234567890123')).toEqual({scheme:'0221',value:'T1234567890123'});
  expect(standard.createCorporateNumber('1234567890123').scheme).toBe('0188');
  expect(standard.createTaxId('T1234567890123').scheme).toBe('VAT');
  expect(standard.JAPANESE_EDI_DEFAULTS.customizationId).toBe('urn:peppol:pint:billing-1@jp-1');
  expect(standard.JAPANESE_EDI_DEFAULTS.profileId).toBe('urn:peppol:bis:billing');
  expect(standard.createTaxId('T1234567890123').scheme).not.toBe('9914');
  expect(standard.createCorporateNumber('1234567890123').scheme).not.toBe('9925');
});
test('official JP PINT tax categories and UNCL4461 payment labels remain consistent with the checker',()=>{
  // Independent expected values from JP PINT 1.1.3 / UNCL4461 D.16B, May 2026.
  expect(Object.keys(standard.VATEX_CATEGORIES).sort()).toEqual(['AA','E','G','O','S']);
  const party=standard.createParty(standard.createQualifiedInvoicePartyId('T1234567890123'),'Seller',{taxId:standard.createTaxId('T1234567890123')});
  for (const code of ['S','AA','E','G','O'] as const) {
    const percent = code==='S'?10:code==='AA'?8:0;
    const category=standard.createTaxCategory(standard.VATEX_CATEGORIES[code].code as typeof code,percent);
    const invoice=standard.createInvoice('I','2026-10-16',party,party,[standard.createLine('1','item',1,'EA',100,{taxCategory:category})],standard.createFinancials([standard.createTaxSubtotal(100,percent,category)]));
    expect(standard.validateEdiDocument(invoice).issues.filter(issue=>issue.code==='PINT-042')).toEqual([]);
  }
  expect(standard.VATEX_LABELS.AA).toBe('軽減税率');
  expect(standard.PAYMENT_MEANS_CODES['1'].label_en).toBe('Instrument not defined');
  expect(standard.PAYMENT_MEANS_CODES['10'].label_en).toBe('In cash');
  expect(standard.PAYMENT_MEANS_CODES['42'].label_en).toBe('Payment to bank account');
});
test('zero invoices, fully prepaid invoices and mixed standard/reduced tax remain valid',()=>{
  const party=standard.createParty(standard.createQualifiedInvoicePartyId('T1234567890123'),'Seller',{taxId:standard.createTaxId('T1234567890123')});
  for(const zero of [true,false]){
    const lines=[standard.createLine('1','Standard',1,'EA',zero?0:1000,{taxCategory:standard.createTaxCategory('S',10)}),standard.createLine('2','Reduced',1,'EA',zero?0:2000,{taxCategory:standard.createTaxCategory('S',8)})];
    const taxes=[standard.createTaxSubtotal(zero?0:1000,zero?0:100,standard.createTaxCategory('S',10)),standard.createTaxSubtotal(zero?0:2000,zero?0:160,standard.createTaxCategory('S',8))];
    const financials=standard.createFinancials(taxes,zero?0:3260);
    const invoice=standard.createInvoice('I-1','2026-10-16',party,party,lines,financials);
    expect(invoice.financials.payable_amount.value).toBe(0);
    const result=standard.validateEdiDocument(invoice);expect(result.issues.filter(i=>i.severity==='error')).toEqual([]);
  }
});
