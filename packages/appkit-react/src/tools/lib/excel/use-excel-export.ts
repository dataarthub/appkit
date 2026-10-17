/**
 * @fileoverview Excel エクスポート React フック
 *
 * @module lib/excel/use-excel-export
 */

import { useCallback, useState } from 'react';
import type { ExcelAdapter, ExcelGenerateOptions, ExcelWorkbookData } from './types';

/**
 * useExcelExport フックの戻り値
 */
export interface UseExcelExportReturn {
  /** エクスポート実行中フラグ */
  isExporting: boolean;
  /** エラー情報 */
  error: Error | null;
  /** Excel を生成してダウンロードを実行する関数 */
  exportExcel: (
    data: ExcelWorkbookData,
    filename?: string,
    options?: ExcelGenerateOptions
  ) => Promise<void>;
  /** Excel バイナリ（Uint8Array）を生成して取得する関数 */
  generateExcel: (
    data: ExcelWorkbookData,
    options?: ExcelGenerateOptions
  ) => Promise<Uint8Array | null>;
  /** エラーステートのリセット */
  resetError: () => void;
}

/**
 * Excel アダプタを利用してエクスポート操作を行う React フック
 *
 * @param adapter ExcelAdapter インスタンス
 *
 * @example
 * ```tsx
 * const adapter = useMemo(() => new HttpServerExcelAdapter('/api/export-excel'), []);
 * const { isExporting, exportExcel, error } = useExcelExport(adapter);
 *
 * return (
 *   <button onClick={() => exportExcel(myReportData, 'monthly.xlsx')} disabled={isExporting}>
 *     {isExporting ? 'エクスポート中...' : 'Excel出力'}
 *   </button>
 * );
 * ```
 */
export function useExcelExport(adapter: ExcelAdapter): UseExcelExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const exportExcel = useCallback(
    async (
      data: ExcelWorkbookData,
      filename?: string,
      options?: ExcelGenerateOptions
    ): Promise<void> => {
      setIsExporting(true);
      setError(null);
      try {
        await adapter.download(data, filename, options);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsExporting(false);
      }
    },
    [adapter]
  );

  const generateExcel = useCallback(
    async (
      data: ExcelWorkbookData,
      options?: ExcelGenerateOptions
    ): Promise<Uint8Array | null> => {
      setIsExporting(true);
      setError(null);
      try {
        const bytes = await adapter.generate(data, options);
        return bytes;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      } finally {
        setIsExporting(false);
      }
    },
    [adapter]
  );

  return {
    isExporting,
    error,
    exportExcel,
    generateExcel,
    resetError,
  };
}
