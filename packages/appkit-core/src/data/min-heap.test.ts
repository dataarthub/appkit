import { expect, it } from 'vitest';
import { MinHeap } from './min-heap';

it('orders interleaved insertions, duplicates and empty pops', () => {
  const heap = new MinHeap<number>((a, b) => a - b);
  expect(heap.pop()).toBeUndefined();
  [9, 1, 4, 1, -3].forEach((value) => heap.push(value));
  expect(heap.peek()).toBe(-3);
  expect(heap.pop()).toBe(-3);
  heap.push(0);
  expect(Array.from({ length: 5 }, () => heap.pop())).toEqual([0, 1, 1, 4, 9]);
  expect(heap.peek()).toBeUndefined();
});
