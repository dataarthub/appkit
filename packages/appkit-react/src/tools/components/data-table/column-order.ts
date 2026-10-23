/** Reorder a registered leaf subset while retaining hidden/group-external column slots. */
export function reorderVisibleColumns(
  order: string[], leafIds: string[], registeredIds: string[], sourceId: string,
  initialIndex: number, index: number,
): string[] {
  if (!Number.isInteger(initialIndex) || !Number.isInteger(index) || initialIndex < 0 ||
    index < 0 || index >= registeredIds.length || registeredIds[initialIndex] !== sourceId ||
    initialIndex === index || new Set(registeredIds).size !== registeredIds.length) return order;
  const valid = new Set(leafIds);
  if (registeredIds.some(id => !valid.has(id))) return order;
  const complete = [...new Set([...order.filter(id => valid.has(id)), ...leafIds])];
  const moved = [...registeredIds];
  moved.splice(index, 0, ...moved.splice(initialIndex, 1));
  const registered = new Set(registeredIds);
  let position = 0;
  return complete.map(id => registered.has(id) ? moved[position++] : id);
}

interface ColumnIdentity {
  id?: string;
  accessorKey?: PropertyKey;
  header?: unknown;
  columns?: readonly ColumnIdentity[];
}
/** Match native column ID derivation for nested leaf definitions. */
export function getLeafColumnIds(columns: readonly ColumnIdentity[]): string[] {
  return columns.flatMap(column => column.columns?.length
    ? getLeafColumnIds(column.columns)
    : [column.id ?? (column.accessorKey !== undefined ? String(column.accessorKey).replaceAll('.', '_') : undefined) ?? (typeof column.header === 'string' ? column.header : '')])
    .filter(Boolean);
}
