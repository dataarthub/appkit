import {expect, test} from 'bun:test';
import {reorderVisibleColumns, getLeafColumnIds} from './column-order';

test('moves visible columns while preserving hidden slots and all logical leaf IDs', () => {
  expect(reorderVisibleColumns(['select', 'hidden', 'status', 'email'], ['select', 'hidden', 'status', 'email'], ['select', 'status', 'email'], 'status', 1, 2)).toEqual(['select', 'hidden', 'email', 'status']);
});
test('supports grouped leaf subsets without moving columns from another header group', () => {
  expect(reorderVisibleColumns(['left', 'name', 'email', 'right'], ['left', 'name', 'email', 'right'], ['name', 'email'], 'email', 1, 0)).toEqual(['left', 'email', 'name', 'right']);
});
test('reconciles stale persisted group IDs and adds selection/row-number leaf IDs once', () => {
  expect(reorderVisibleColumns(['old-group', 'status', 'status', 'email'], ['rowNumber', 'select', 'status', 'email'], ['rowNumber', 'select', 'status', 'email'], 'status', 2, 3)).toEqual(['rowNumber', 'select', 'email', 'status']);
});
test('rejects stale/malformed drag indices or registration lists without changing order', () => {
  const order = ['a', 'hidden', 'b'];
  for (const [visible, id, from, to] of [
    [['a','b'], 'missing', 0, 1], [['a','b'], 'a', -1, 1], [['a','b'], 'a', 0, -1],
    [['a','b'], 'a', 0, 2], [['a','b'], 'a', .5, 1], [['a','b'], 'b', 0, 1],
    [['a','a'], 'a', 0, 1], [['a','removed'], 'a', 0, 1],
  ] as const) expect(reorderVisibleColumns(order, ['a','hidden','b'], [...visible], id, from, to)).toBe(order);
});
test('same-position drops preserve state identity', () => {
  const order=['a','b']; expect(reorderVisibleColumns(order,order,order,'a',0,0)).toBe(order);
});

test('initial order uses nested leaf IDs and native accessor-key IDs rather than group IDs',()=>{
 expect(getLeafColumnIds([{id:'group',columns:[{accessorKey:'profile.name'},{id:'mail',accessorKey:'email'}]},{accessorKey:'amount'}])).toEqual(['profile_name','mail','amount']);
});
