/** Internal binary min-heap. Equal priorities need an explicit tie-breaker when order matters. */
export class MinHeap<T> {
  private items: T[] = [];
  /** Set the ordering used by all operations. */
  constructor(private compare: (a: T, b: T) => number) {}
  /** Inspect the minimum without removing it. */
  peek(): T | undefined {
    return this.items[0];
  }
  /** Insert one item in O(log n). */
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
  /** Remove the minimum in O(log n); empty heaps return undefined. */
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
