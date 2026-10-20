type Node = { min: number; max: number; lazy: number; left?: Node; right?: Node };
const node = (value = 0): Node => ({ min: value, max: value, lazy: 0 });
/**
 * Relative tolerance for fractional resource-unit accumulation.
 *
 * @param demand - Requested resource units; nonfinite demand always exceeds capacity.
 * @param capacity - Available units, expected finite and positive by the planner.
 * @returns Whether demand exceeds capacity beyond a relative tolerance of 1e-9.
 *
 * @example
 * ```typescript
 * import { exceedsCapacity } from '@alneas/appkit-core/graph/planning/capacity-index';
 *
 * console.log(exceedsCapacity(2, 1)); // true
 * ```
 */
export const exceedsCapacity = (demand: number, capacity: number) =>
  !Number.isFinite(demand) || demand - capacity > Math.max(demand, capacity) * 1e-9;

/**
 * Internal sparse range-add index over working-day ordinals. Memory grows with reservations,
 * not resource count × horizon. Queries skip uniform occupied/free ranges without scanning days.
 *
 * @example
 * ```typescript
 * import { GanttCapacityIndex } from '@alneas/appkit-core/graph/planning/capacity-index';
 *
 * let operations = 0;
 * const index = new GanttCapacityIndex(10, () => {
 *   if (++operations > 1000) throw new Error('Budget exceeded');
 * });
 * index.reserve(0, 2, 1);
 * console.log(index.first(0, 10, 1, 1));
 * ```
 */
export class GanttCapacityIndex {
  private root = node();

  /**
   * Use an exclusive axis length and a shared per-plan work-budget guard.
   *
   * @param length - Exclusive axis length; the caller supplies a positive integer horizon.
   * @param checkBudget - Synchronous callback invoked during tree visits; returns no value and may throw to stop excessive work.
   *
   * @example
   * ```typescript
   * import { GanttCapacityIndex } from '@alneas/appkit-core/graph/planning/capacity-index';
   *
   * let operations = 0;
   * const index = new GanttCapacityIndex(10, () => {
   *   if (++operations > 1000) throw new Error('Budget exceeded');
   * });
   * index.reserve(0, 2, 1);
   * console.log(index.first(0, 10, 1, 1));
   * ```
   */
  constructor(
    private length: number,
    private checkBudget: () => void,
  ) {}
  private apply(n: Node, units: number) {
    n.min += units;
    n.max += units;
    n.lazy += units;
  }
  private split(n: Node) {
    if (!n.left) {
      n.left = node(n.min);
      n.right = node(n.min);
    } else {
      this.apply(n.left, n.lazy);
      this.apply(n.right!, n.lazy);
    }
    n.lazy = 0;
  }

  /**
   * Add usage on a half-open working-day interval without enumerating its days.
   *
   * @param from - Inclusive working-day ordinal in the configured axis.
   * @param to - Exclusive ordinal; an empty/reversed range does nothing.
   * @param units - Resource usage added to each ordinal in the range.
   * @returns No value; updates the in-memory index.
   * @throws Propagates checkBudget callback errors during visits.
   *
   * @example
   * ```typescript
   * import { GanttCapacityIndex } from '@alneas/appkit-core/graph/planning/capacity-index';
   *
   * let operations = 0;
   * const index = new GanttCapacityIndex(10, () => {
   *   if (++operations > 1000) throw new Error('Budget exceeded');
   * });
   * index.reserve(0, 2, 1);
   * console.log(index.first(0, 10, 1, 1));
   * ```
   */
  reserve(from: number, to: number, units: number) {
    const visit = (n: Node, lo: number, hi: number) => {
      this.checkBudget();
      if (to <= lo || from >= hi) return;
      if (from <= lo && hi <= to) {
        this.apply(n, units);
        return;
      }
      this.split(n);
      const mid = (lo + hi) >>> 1;
      visit(n.left!, lo, mid);
      visit(n.right!, mid, hi);
      n.min = Math.min(n.left!.min, n.right!.min);
      n.max = Math.max(n.left!.max, n.right!.max);
    };
    if (from < to) visit(this.root, 0, this.length);
  }

  /**
   * First conflicting (or available) day in [from,to), or -1.
   *
   * @param from - Inclusive working-day ordinal to search.
   * @param to - Exclusive ordinal; an empty/reversed range returns -1.
   * @param units - Proposed additional demand.
   * @param capacity - Available resource units.
   * @param conflict - Search for excess demand when true (default); false searches for availability.
   * @returns First matching ordinal or -1 if none.
   * @throws Propagates checkBudget callback errors during visits.
   *
   * @example
   * ```typescript
   * import { GanttCapacityIndex } from '@alneas/appkit-core/graph/planning/capacity-index';
   *
   * let operations = 0;
   * const index = new GanttCapacityIndex(10, () => {
   *   if (++operations > 1000) throw new Error('Budget exceeded');
   * });
   * index.reserve(0, 2, 1);
   * console.log(index.first(0, 10, 1, 1));
   * ```
   */
  first(from: number, to: number, units: number, capacity: number, conflict = true): number {
    const matches = (usage: number) => exceedsCapacity(usage + units, capacity) === conflict;
    const visit = (n: Node, lo: number, hi: number): number => {
      this.checkBudget();
      if (to <= lo || from >= hi || !matches(conflict ? n.max : n.min)) return -1;
      if (matches(conflict ? n.min : n.max)) return Math.max(from, lo);
      this.split(n);
      const mid = (lo + hi) >>> 1;
      const left = visit(n.left!, lo, mid);
      return left === -1 ? visit(n.right!, mid, hi) : left;
    };
    return from < to ? visit(this.root, 0, this.length) : -1;
  }
}
