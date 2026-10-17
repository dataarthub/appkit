import { expect, test } from 'bun:test';
import { withTimeout, OperationTimeoutError } from './async';
test('deadline success, original failure, timeout, custom error and timer cleanup', async () => {
  expect(await withTimeout(Promise.resolve(7), 30_000)).toBe(7);
  const original = new Error('original');
  await expect(withTimeout(Promise.reject(original), 30_000)).rejects.toBe(original);
  await expect(withTimeout(new Promise(() => {}), 1)).rejects.toBeInstanceOf(OperationTimeoutError);
  const custom = new Error('custom');
  await expect(withTimeout(new Promise(() => {}), 0, () => custom)).rejects.toBe(custom);
  await expect(
    withTimeout(new Promise(() => {}), 0, () => {
      throw custom;
    }),
  ).rejects.toBe(custom);
  for (const delay of [-1, NaN, Infinity, 2_147_483_648])
    await expect(withTimeout(Promise.resolve(1), delay)).rejects.toThrow(/Timeout/);
});
