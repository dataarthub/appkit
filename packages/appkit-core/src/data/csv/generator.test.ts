import { describe, expect, it } from 'vitest';
import { CSVParser, DEFAULT_CSV_PARSE_CONFIG, type CSVParseConfig } from './parser';
import { CSVGenerator, DEFAULT_CSV_CONFIG, type CSVConfig } from './generator';

const columns = [{ accessorKey: 'value' }];
const mappings = [{ columnId: 'value', columnLabel: 'value', include: true, order: 0 }];
const generate = (values: unknown[], config: Partial<CSVConfig> = {}) =>
  new CSVGenerator({ ...DEFAULT_CSV_CONFIG, ...config }).generate(
    values.map((value) => ({ value })),
    columns,
    mappings,
  );
const parse = (csv: string, config: Partial<CSVParseConfig> = {}) =>
  new CSVParser({
    ...DEFAULT_CSV_PARSE_CONFIG,
    trimWhitespace: false,
    skipEmptyLines: false,
    ...config,
  }).parse(csv);

describe('CSVGenerator', () => {
  it('round trips quotes, delimiters, newlines, whitespace and empty fields', () => {
    const values = ['a,b', 'a"b', 'a\r\nb', ' 日本語 ', '', '=1+1', '00123'];
    expect(parse(generate(values))).toEqual([['value'], ...values.map((v) => [v])]);
  });
  it.each(['=1+1', '+cmd', '-cmd', '@SUM(A1)', '\tcmd', '\rcmd', '\ncmd', '  =1', '＝1'])(
    'protects spreadsheet text %j',
    (value) => {
      expect(parse(generate([value], { escapeFormulae: true }))[1]).toEqual([`'${value}`]);
    },
  );
  it('preserves numeric negatives but protects negative-looking strings', () => {
    expect(parse(generate([-12, '-12', 0, null, undefined], { escapeFormulae: true }))).toEqual([
      ['value'],
      ['-12'],
      ["'-12"],
      ['0'],
      [''],
      [''],
    ]);
  });
  it('protects headers, preserves mapping order and does not mutate mappings', () => {
    const selected = [
      { ...mappings[0], customLabel: '=header', order: 1 },
      { columnId: 'other', columnLabel: 'other', include: true, order: 0 },
    ];
    const csv = new CSVGenerator({ ...DEFAULT_CSV_CONFIG, escapeFormulae: true }).generate(
      [{ value: 'x', other: 'y' }],
      [...columns, { id: 'other' }],
      selected,
    );
    expect(parse(csv)).toEqual([
      ['other', "'=header"],
      ['y', 'x'],
    ]);
    expect(selected[0].order).toBe(1);
  });
  it('supports custom delimiter, quote and escape characters', () => {
    const csv = generate(['a;b', "a'b"], {
      delimiter: ';',
      quoteChar: "'",
      escapeChar: '\\',
      includeHeader: false,
    });
    expect(
      parse(csv, { delimiter: ';', quoteChar: "'", escapeChar: '\\' }),
    ).toEqual([['a;b'], ["a'b"]]);
  });
  it('rejects unsafe never mode instead of corrupting record boundaries', () => {
    expect(() => generate(['a,b'], { stringWrapping: 'never' })).toThrow('requires quoting');
    expect(generate(['abc'], { stringWrapping: 'never' })).toBe('value\nabc');
  });
  it('supports always wrapping, missing columns, dates and empty selection', () => {
    expect(generate(['abc'], { stringWrapping: 'always' })).toBe('"value"\n"abc"');
    const date = new Date(2026, 0, 2);
    expect(parse(generate([date]))[1]).toEqual([date.toLocaleDateString()]);
    expect(parse(generate([date], { dateLocale: 'ja-JP' }))[1]).toEqual([date.toLocaleDateString('ja-JP')]);
    expect(new CSVGenerator().generate([{ value: 'x' }], [], mappings)).toBe('value\n');
    expect(new CSVGenerator().generate([{ value: 'x' }], columns, [])).toBe('');
    expect(generate([])).toBe('');
  });
  it.each([{ delimiter: '' }, { delimiter: '\n' }, { quoteChar: '' }, { escapeChar: 'xx' }])(
    'rejects invalid config %j',
    (config) => {
      expect(() => generate(['x'], config)).toThrow('Invalid CSV');
    },
  );
});
