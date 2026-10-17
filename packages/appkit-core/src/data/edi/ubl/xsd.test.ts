import {test,expect} from 'bun:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {toUblXml} from './xml';
import type {EdiDocument} from '../types';
const root=path.resolve(import.meta.dir,'../../../..');
const fixtures=path.join(root,'tests/fixtures/ubl-2.1');
const base={schema_version:'1',id:'INV<&1',issue_date:'2026-10-16',currency:'JPY',doc_type_code:'380',
  supplier:{id:{scheme:'0188',value:'1234567890123'},name:'A & B <seller>',tax_id:{scheme:'VAT',value:'T1234567890123'},legal_registration:{scheme:'0188',value:'1234567890123'},address:{country:'JP',street_name:'A & B',city:'Tokyo'}},
  buyer:{id:{scheme:'0188',value:'9876543210987'},name:'Buyer'},
  lines:[{line_id:'1',description:'Item & more',quantity:1,unit_code:'EA',unit_price:1000,net_amount:1000,po_line_ref:'1',tax_category:{id:'S',percent:10,tax_scheme:'VAT'}}],
  financials:{tax_total:{tax_amount:{value:100,currency:'JPY'},tax_subtotals:[{taxable_amount:{value:1000,currency:'JPY'},tax_amount:{value:100,currency:'JPY'},tax_category:{id:'S',percent:10,tax_scheme:'VAT'}}]},tax_inclusive_amount:{value:1100,currency:'JPY'},payable_amount:{value:0,currency:'JPY'},prepaid_amount:{value:1100,currency:'JPY'}}};
test('all four document roots validate offline against unmodified official UBL 2.1 XSD',()=>{
  const tmp=path.join(root,'.verification/tmp');mkdirSync(tmp,{recursive:true});const dir=mkdtempSync(path.join(tmp,'ubl-'));
  try{
    for(const [doc_type,ubl] of [['Invoice','Invoice'],['CreditNote','CreditNote'],['PurchaseOrder','Order'],['DespatchAdvice','DespatchAdvice']] as const){
      const xml=toUblXml({...base,doc_type,doc_type_code:doc_type==='CreditNote'?'381':'380'} as EdiDocument);
      const file=path.join(dir,ubl+'.xml');writeFileSync(file,xml);
      execFileSync('xmllint',['--nonet','--noout','--schema',path.join(fixtures,'xsd/maindoc',`UBL-${ubl}-2.1.xsd`),file],{stdio:'pipe'});
      if(ubl==='Invoice') {expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="JPY">1000</cbc:TaxExclusiveAmount>');expect(xml).toContain('<cbc:PayableAmount currencyID="JPY">0</cbc:PayableAmount>');}
      expect(xml).toContain('A &amp; B &lt;seller&gt;');
    }
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('XSD fixture source hashes are stable',()=>{
  const sources=JSON.parse(readFileSync(path.join(fixtures,'sources.json'),'utf8'));
  for(const [file,hash] of Object.entries(sources.sha256)) expect(createHash('sha256').update(readFileSync(path.join(fixtures,'xsd',file))).digest('hex')).toBe(hash as string);
});
test('serializer rejects nonfinite amounts, missing despatch references and invalid XML characters',()=>{
  expect(()=>toUblXml({...base,doc_type:'DespatchAdvice',doc_type_code:null,references:{order_reference:'PO-1'},lines:[{...base.lines[0],po_line_ref:undefined}]} as EdiDocument)).toThrow('poLineRef');
  expect(()=>toUblXml({...base,doc_type:'Invoice',note:'bad\u0000'} as EdiDocument)).toThrow('XML');
  expect(()=>toUblXml({...base,doc_type:'Invoice',financials:{...base.financials,payable_amount:{value:Infinity,currency:'JPY'}}} as EdiDocument)).toThrow('finite');
});
