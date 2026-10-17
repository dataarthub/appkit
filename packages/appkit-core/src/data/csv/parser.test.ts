import { describe, expect, it } from 'vitest';
import { CSVParser, DEFAULT_CSV_PARSE_CONFIG, type CSVParseConfig } from './parser';

function parse(input: string, config: Partial<CSVParseConfig> = {}) {
  return new CSVParser({ ...DEFAULT_CSV_PARSE_CONFIG, ...config }).parse(input);
}

describe('CSVParser', () => {
  it.each([true, false])('keeps the header row with hasHeader=%s', (hasHeader) => {
    expect(parse('name,value\nAlice,001', { hasHeader })).toEqual([
      ['name', 'value'],
      ['Alice', '001'],
    ]);
  });

  it('parses quoted delimiters, escaped quotes and multiline fields', () => {
    expect(parse('name,notes\n"Doe, Jane","said ""hello""\nthen left"')).toEqual([
      ['name', 'notes'],
      ['Doe, Jane', 'said "hello"\nthen left'],
    ]);
  });

  it('handles a BOM and CRLF while preserving quoted CRLF', () => {
    expect(parse('\uFEFFname,notes\r\nAlice,"line 1\r\nline 2"\r\n')).toEqual([
      ['name', 'notes'],
      ['Alice', 'line 1\r\nline 2'],
    ]);
  });

  it('preserves all field whitespace when trimming is disabled', () => {
    expect(
      parse('  Alice , value  \r\n"  Bob  ","\n spaced \n"', { trimWhitespace: false }),
    ).toEqual([
      ['  Alice ', ' value  '],
      ['  Bob  ', '\n spaced \n'],
    ]);
  });

  it('trims individual fields by default', () => {
    expect(parse('  Alice , value  \n"  Bob  ","  quoted  "')).toEqual([
      ['Alice', 'value'],
      ['Bob', 'quoted'],
    ]);
  });

  it('honors custom delimiters, quotes and escape characters', () => {
    expect(
      parse("name;note\n'A;B';'it\\'s fine'", {
        delimiter: ';',
        quoteChar: "'",
        escapeChar: '\\',
      }),
    ).toEqual([
      ['name', 'note'],
      ['A;B', "it's fine"],
    ]);
  });

  it('can disable quote handling', () => {
    expect(parse('"a",b', { quoteChar: '' })).toEqual([['"a"', 'b']]);
  });

  it('skips empty and whitespace-only lines, but keeps delimiter-only rows', () => {
    expect(parse('\r\n \t \r\n,,\r\n', { trimWhitespace: false })).toEqual([['', '', '']]);
  });

  it('retains explicitly quoted empty/whitespace fields when skipping blank lines', () => {
    expect(parse('\n""\n"  "\n')).toEqual([[''], ['']]);
    expect(parse('"\n\n"\n')).toEqual([['']]);
  });

  it('keeps blank rows and whitespace when configured', () => {
    expect(parse('\n \t \n', { skipEmptyLines: false, trimWhitespace: false })).toEqual([
      [''],
      [' \t '],
      [''],
    ]);
    expect(parse('')).toEqual([]);
    expect(parse('', { skipEmptyLines: false })).toEqual([['']]);
  });

  it('retains trailing empty fields and rows with different field counts', () => {
    expect(parse('a,b,\nx\ny,z')).toEqual([['a', 'b', ''], ['x'], ['y', 'z']]);
  });

  it.each(['a,"unterminated', 'a,"quoted"garbage,b'])('rejects malformed CSV: %s', (input) => {
    expect(() => parse(input)).toThrow(/Invalid CSV.*row.*quote/i);
  });
});
