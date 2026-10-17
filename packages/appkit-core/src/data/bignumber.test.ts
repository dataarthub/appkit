import { test, expect } from 'bun:test';
import BigNumber from 'bignumber.js';
import { BigNumberDataAccessAdapter } from './bignumber-adapter';
import type { BigNumberConstructorLike } from './bignumber-adapter';
import type { DataAccessAdapter } from './types';
// This assignment also checks compatibility with the real SDK without type assertions.
const Constructor: BigNumberConstructorLike = BigNumber;

test('real decimal constructor preserves digits beyond IEEE-754 and nested rounding', async () => {
  let persisted: Record<string, unknown> = {};
  const base = { create: async (_collection: string, data: Record<string, unknown>) => { persisted = data; return data; } } as unknown as DataAccessAdapter;
  const adapter = new BigNumberDataAccessAdapter({ base, BigNumber: Constructor, fields: { amount: { scale: 2 }, 'lines[].amount': { scale: 3 } } });
  const input = { amount: '9007199254740993.125', lines: [{ amount: '0.1004' }] };
  const output = await adapter.create<{ amount: BigNumber; lines: Array<{ amount: BigNumber }> }>('records', input);
  expect(persisted).toEqual({ amount: '9007199254740993.13', lines: [{ amount: '0.100' }] });
  expect(output.amount.toFixed(2)).toBe('9007199254740993.13');
  expect(output.lines[0]?.amount.toFixed(3)).toBe('0.100');
  expect(input.amount).toBe('9007199254740993.125');
});
test('decimal filters encode bound values exactly and strict mode rejects non-numeric input', async () => {
  let captured: unknown;
  const base = { find: async (_collection: string, filter: unknown) => { captured = filter; return [{ amount: '9007199254740993.13' }]; } } as unknown as DataAccessAdapter;
  const adapter = new BigNumberDataAccessAdapter({ base, BigNumber: Constructor, fields: { amount: { scale: 2 } } });
  const rows = await adapter.find<{ amount: BigNumber }>('records', { amount: { $gte: new BigNumber('9007199254740993.13') } });
  expect(captured).toEqual({ amount: { $gte: '9007199254740993.13' } });
  expect(BigNumber.isBigNumber(rows[0]?.amount)).toBe(true);
  await expect(adapter.find('records', { amount: 'not-a-number' })).rejects.toThrow('invalid decimal value');
});
