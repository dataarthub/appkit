import { describe, it, expect } from 'bun:test';
import { MockExcelAdapter } from './mock-adapter';
import { CsvExcelAdapter } from './csv-adapter';
import type { ExcelWorkbookData } from './types';

describe('Excel Adapters (Mock & CSV)', () => {
  const sampleWorkbook: ExcelWorkbookData = {
    sheets: [
      {
        name: '売上集計',
        columns: [
          { header: '商品名', key: 'product', width: 20 },
          { header: '単価', key: 'price', width: 10 },
          { header: '数量', key: 'qty', width: 10 },
        ],
        rows: [
          { product: 'りんご', price: 150, qty: 3 },
          { product: 'みかん, 特選', price: 200, qty: 5 }, // test comma escaping
        ],
      },
    ],
  };

  it('generates dummy zip payload with MockExcelAdapter', async () => {
    const adapter = new MockExcelAdapter({ delayMs: 0 });
    const bytes = await adapter.generate(sampleWorkbook);

    expect(bytes).toBeInstanceOf(Uint8Array);
    // Should have PK zip signature header
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    const text = new TextDecoder().decode(bytes.slice(4));
    expect(text).toContain('売上集計');
  });

  it('generates UTF-8 CSV with BOM and quoted values using CsvExcelAdapter', async () => {
    const csvAdapter = new CsvExcelAdapter({ includeBom: true });
    const bytes = await csvAdapter.generate(sampleWorkbook);

    // BOM: EF BB BF
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const csvText = new TextDecoder().decode(bytes.slice(3));
    const lines = csvText.trim().split(/\r?\n/);

    expect(lines[0]).toBe('商品名,単価,数量');
    expect(lines[1]).toBe('りんご,150,3');
    expect(lines[2]).toBe('"みかん, 特選",200,5');
  });
});
