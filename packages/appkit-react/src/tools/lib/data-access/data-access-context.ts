import { createContext, useContext } from 'react';
import type { DataAccessAdapter } from './types';

/**
 * DataAccess アダプターを React コンポーネントツリー全体で共有するための Context です。
 */
export const DataAccessContext = createContext<DataAccessAdapter | null>(null);

/**
 * 現在の DataAccess アダプターを取得するためのカスタムフックです。
 * DataAccessProvider の内側で使用する必要があります。
 *
 * @returns 現在設定されている DataAccessAdapter インスタンス
 * @throws DataAccessProvider の外側で使用された場合にエラーを投げます
 */
export const useDataAccess = () => {
  const context = useContext(DataAccessContext);
  if (!context) {
    throw new Error('useDataAccess must be used within a DataAccessProvider');
  }
  return context;
};
