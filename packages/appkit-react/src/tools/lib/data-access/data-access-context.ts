import { createContext, useContext } from 'react';
import type { DataAccessAdapter } from './types';

/**
 * Nullable React context carrying the host data-access adapter.
 * @see DataAccessProvider for setup and useDataAccess for consumption.
 */
export const DataAccessContext = createContext<DataAccessAdapter | null>(null);

/**
 * Reads the host data-access adapter from the nearest DataAccessProvider.
 * @returns Supplied adapter; no network request is made by this hook.
 * @throws Error when rendered outside DataAccessProvider.
 * @remarks No CSS or QueryClientProvider is needed for this hook alone; query hooks
 * add their own TanStack provider requirement. Backend access remains host-owned.
 * @example
 * ```tsx
 * import type { ComponentProps } from 'react';
 * import { DataAccessProvider, useDataAccess } from '@alneas/appkit-react/tools/data-access/react';
 * type DataAccessAdapter = ComponentProps<typeof DataAccessProvider>['adapter'];
 * function CollectionHint() { const adapter = useDataAccess(); return <span>{adapter ? 'Data adapter available' : 'Unavailable'}</span>; }
 * export function DataRoot({ adapter }: { adapter: DataAccessAdapter }) { return <DataAccessProvider adapter={adapter}><CollectionHint /></DataAccessProvider>; }
 * ```
 */
export const useDataAccess = () => {
  const context = useContext(DataAccessContext);
  if (!context) {
    throw new Error('useDataAccess must be used within a DataAccessProvider');
  }
  return context;
};
