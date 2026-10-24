import { describe, test, expect } from 'bun:test';
import BigNumber11 from 'bignumber.js';
import BigNumber9 from 'bignumber-v9';
import { BigNumberDataAccessAdapter } from './bignumber-adapter';
import type {
  BigNumberConstructorLike,
  BigNumberLike,
} from './bignumber-adapter';
import type { DataAccessAdapter } from './types';
// These assignments check both real SDKs without type assertions.
const constructors: Array<[string, typeof BigNumber11 | typeof BigNumber9]> = [
  ['9', BigNumber9],
  // Match BigNumber 9's permissive parsing without changing host defaults.
  ['11 (STRICT:false)', BigNumber11.clone({ STRICT: false })],
];

for (const [version, BigNumber] of constructors) {
  describe(`BigNumber ${version}`, () => {
    const Constructor: BigNumberConstructorLike = BigNumber;

    test('real decimal constructor preserves digits beyond IEEE-754 and nested rounding', async () => {
      let persisted: Record<string, unknown> = {};
      const base = {
        create: async (_collection: string, data: Record<string, unknown>) => {
          persisted = data;
          return data;
        },
      } as unknown as DataAccessAdapter;
      const adapter = new BigNumberDataAccessAdapter({
        base,
        BigNumber: Constructor,
        fields: { amount: { scale: 2 }, 'lines[].amount': { scale: 3 } },
      });
      const input = {
        amount: '9007199254740993.125',
        lines: [{ amount: '0.1004' }],
      };
      const output = await adapter.create<{
        amount: BigNumberLike;
        lines: Array<{ amount: BigNumberLike }>;
      }>('records', input);
      expect(persisted).toEqual({
        amount: '9007199254740993.13',
        lines: [{ amount: '0.100' }],
      });
      expect(output.amount.toFixed(2)).toBe('9007199254740993.13');
      expect(output.lines[0]?.amount.toFixed(3)).toBe('0.100');
      expect(input.amount).toBe('9007199254740993.125');
    });
    test('decimal filters encode bound values exactly and strict mode rejects non-numeric input', async () => {
      let captured: unknown;
      const base = {
        find: async (_collection: string, filter: unknown) => {
          captured = filter;
          return [{ amount: '9007199254740993.13' }];
        },
      } as unknown as DataAccessAdapter;
      const adapter = new BigNumberDataAccessAdapter({
        base,
        BigNumber: Constructor,
        fields: { amount: { scale: 2 } },
      });
      const rows = await adapter.find<{ amount: BigNumberLike }>('records', {
        amount: { $gte: new BigNumber('9007199254740993.13') },
      });
      expect(captured).toEqual({ amount: { $gte: '9007199254740993.13' } });
      expect(BigNumber.isBigNumber(rows[0]?.amount)).toBe(true);
      await expect(
        adapter.find('records', { amount: 'not-a-number' }),
      ).rejects.toThrow('invalid decimal value');
    });

    test('non-strict decimal fields preserve invalid input without throwing', async () => {
      let persisted: Record<string, unknown> = {};
      const base = {
        create: async (_collection: string, data: Record<string, unknown>) => {
          persisted = data;
          return data;
        },
      } as unknown as DataAccessAdapter;
      const adapter = new BigNumberDataAccessAdapter({
        base,
        BigNumber: Constructor,
        fields: { amount: { scale: 2 } },
        strict: false,
      });
      const input = { amount: 'not-a-number' };
      expect(await adapter.create('records', input)).toEqual(input);
      expect(persisted).toEqual(input);
    });

    test('non-finite decimal input keeps Appkit errors and nullable values pass through', async () => {
      const create = async (
        _collection: string,
        data: Record<string, unknown>,
      ) => data;
      const adapter = new BigNumberDataAccessAdapter({
        base: { create } as unknown as DataAccessAdapter,
        BigNumber: Constructor,
        fields: { amount: { scale: 2 } },
      });
      for (const amount of [NaN, Infinity, 'NaN', 'Infinity']) {
        await expect(adapter.create('records', { amount })).rejects.toThrow(
          'invalid decimal value at "amount"',
        );
      }
      expect(await adapter.create('records', { amount: null })).toEqual({
        amount: null,
      });
      expect(await adapter.create('records', { amount: undefined })).toEqual({
        amount: undefined,
      });
    });
  });
}

describe('host-owned BigNumber constructor errors', () => {
  for (const strict of [true, false]) {
    test(`default BigNumber 11 errors propagate with strict:${strict}`, async () => {
      const base = {
        create: async (_collection: string, data: Record<string, unknown>) =>
          data,
      } as unknown as DataAccessAdapter;
      const adapter = new BigNumberDataAccessAdapter({
        base,
        BigNumber: BigNumber11,
        fields: { amount: {} },
        strict,
      });
      await expect(
        adapter.create('records', { amount: 'not-a-number' }),
      ).rejects.toThrow('[BigNumber Error] Not a number');
    });

    test(`unexpected constructor errors propagate with strict:${strict}`, async () => {
      const failure = new RangeError('decimal backend failure');
      class FailingDecimal {
        constructor(_value: string | number) {
          throw failure;
        }
        static isBigNumber(_value: unknown): _value is FailingDecimal {
          return false;
        }
        decimalPlaces() {
          return this;
        }
        isFinite() {
          return true;
        }
        toFixed() {
          return '';
        }
      }
      let persisted = false;
      const base = {
        create: async (_collection: string, data: Record<string, unknown>) => {
          persisted = true;
          return data;
        },
      } as unknown as DataAccessAdapter;
      const adapter = new BigNumberDataAccessAdapter({
        base,
        BigNumber: FailingDecimal,
        fields: { amount: {} },
        strict,
      });
      await expect(adapter.create('records', { amount: '12.34' })).rejects.toBe(
        failure,
      );
      expect(persisted).toBe(false);
    });
  }
});
