import React from 'react';
import type { DataAccessAdapter } from './types';
import { DataAccessContext } from './data-access-context';

/**
 * Makes a host data-access adapter available to descendants.
 * @param props - Host adapter and child content.
 * @returns Adapter context around children; no requests or adapter disposal occur here.
 * @remarks No CSS is required. Query hooks additionally need QueryClientProvider. Keep the
 * adapter stable to preserve scoped query keys; the backend owns permissions/persistence.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import type { ReactNode } from 'react';
 * import { DataAccessProvider } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * export function DataRoot({ adapter, children }: { adapter: DataAccessAdapter; children: ReactNode }) { return <DataAccessProvider adapter={adapter}>{children}</DataAccessProvider>; }
 * ```
 */
export const DataAccessProvider = ({
  adapter,
  children,
}: {
  /**
   * Stable host adapter providing persistence and authorization semantics.
   */
  adapter: DataAccessAdapter;
  /**
   * Descendants that consume the adapter.
   */
  children: React.ReactNode;
}) => {
  return <DataAccessContext.Provider value={adapter}>{children}</DataAccessContext.Provider>;
};
