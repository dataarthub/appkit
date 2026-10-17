/** Graph templates accept simple identifiers only; never interpolate SQL fragments. */
export function graphSqlIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(value)) {
    throw new Error('Graph SQL identifiers must be simple names of at most 40 characters');
  }
  return value;
}
