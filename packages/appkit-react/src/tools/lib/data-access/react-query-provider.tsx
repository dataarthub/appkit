import React from 'react';
import type { DataAccessAdapter } from './types';
import { DataAccessContext } from './data-access-context';

/**
 * データアクセス層のアダプターを提供するコンテキストプロバイダーです。
 * アプリケーションのルート付近でラップして使用してください。
 */
export const DataAccessProvider = ({
  adapter,
  children,
}: {
  adapter: DataAccessAdapter;
  children: React.ReactNode;
}) => {
  return <DataAccessContext.Provider value={adapter}>{children}</DataAccessContext.Provider>;
};
