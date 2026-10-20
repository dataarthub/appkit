/**
 * Stores values in a binary min-heap using a caller-supplied comparator.
 *
 * @typeParam T - Value stored by reference; its ordering fields must remain stable
 * while the value is in the heap.
 * @remarks Equal comparisons do not guarantee stable insertion order. Add a
 * tie-breaker to the comparator when equal-priority ordering matters. Operations
 * mutate this instance; it provides no synchronization between callers.
 * @example
 * ```ts
 * import { MinHeap } from '@alneas/appkit-core/data/min-heap';
 * const priorities = new MinHeap<number>((a, b) => a - b);
 * priorities.push(3);
 * priorities.push(1);
 * console.log(priorities.peek()); // 1; the value remains in the heap
 * console.log(priorities.pop()); // 1
 * ```
 */
export class MinHeap<T> {
  private items: T[] = [];
  /**
   * Creates an empty heap with a fixed ordering function.
   * @param compare - Synchronous comparison: negative when the first value
   * precedes the second, positive when it follows, and zero for equal priority.
   * Keep it deterministic and avoid mutating the heap from this callback.
   * @example
   * ```ts
   * import { MinHeap } from '@alneas/appkit-core/data/min-heap';
   * const queue = new MinHeap<{ priority: number; id: string }>(
   *   (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
   * );
   * queue.push({ priority: 1, id: 'task-a' });
   * ```
   */
  constructor(private compare: (a: T, b: T) => number) {}
  /**
   * Inspects the first value in comparator order without modifying the heap.
   * @returns The stored value by reference, or undefined when the heap is empty.
   * @example
   * ```ts
   * import { MinHeap } from '@alneas/appkit-core/data/min-heap';
   * const queue = new MinHeap<number>((a, b) => a - b);
   * console.log(queue.peek()); // undefined
   * queue.push(4);
   * console.log(queue.peek()); // 4
   * ```
   */
  peek(): T | undefined {
    return this.items[0];
  }
  /**
   * Inserts a value and restores heap order in O(log n) comparisons.
   * @param value - Value to retain by reference until removed. Do not change its
   * ordering fields while it remains in the heap.
   * @returns No value; mutates this heap.
   * @throws Propagates comparator exceptions. An interrupted insertion can leave
   * partially mutated state; there is no transactional rollback.
   * @example
   * ```ts
   * import { MinHeap } from '@alneas/appkit-core/data/min-heap';
   * const queue = new MinHeap<number>((a, b) => a - b);
   * queue.push(9);
   * queue.push(2);
   * console.log(queue.pop()); // 2
   * ```
   */
  push(value: T) {
    let index = this.items.length;
    this.items.push(value);
    while (index > 0) {
      const parent = (index - 1) >>> 1;
      if (this.compare(this.items[parent], value) <= 0) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = value;
  }
  /**
   * Removes the first value in comparator order in O(log n) comparisons.
   * @returns The removed value by reference, or undefined when the heap is empty.
   * @throws Propagates comparator exceptions. Removal has already begun when
   * comparison runs; an exception does not restore the previous heap state.
   * @example
   * ```ts
   * import { MinHeap } from '@alneas/appkit-core/data/min-heap';
   * const queue = new MinHeap<number>((a, b) => a - b);
   * queue.push(7);
   * console.log(queue.pop()); // 7
   * console.log(queue.pop()); // undefined
   * ```
   */
  pop(): T | undefined {
    const first = this.items[0];
    const last = this.items.pop();
    if (!this.items.length) return first;
    let index = 0;
    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1;
      if (
        child + 1 < this.items.length &&
        this.compare(this.items[child + 1], this.items[child]) < 0
      )
        child++;
      if (this.compare(last!, this.items[child]) <= 0) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = last!;
    return first;
  }
}
