/**
 * @fileoverview Excel download and conversion helper functions
 *
 * @module lib/excel/utils
 */

/**
 * Triggers a file download of Uint8Array binary data in the browser.
 *
 * @param data Binary data to download
 * @param filename File name (e.g., "report.xlsx")
 * @param mimeType MIME type (defaults to .xlsx MIME type)
 */
export function triggerBrowserDownload(
  data: Uint8Array | Blob,
  filename: string,
  mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob =
    data instanceof Blob
      ? data
      : new Blob([data as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Resolves the file name (defaults to metadata title or fallback value when omitted).
 */
export function resolveFilename(
  filename?: string,
  metadataTitle?: string,
  fallback = 'export.xlsx'
): string {
  if (filename && filename.trim().length > 0) {
    return filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  }
  if (metadataTitle && metadataTitle.trim().length > 0) {
    return metadataTitle.endsWith('.xlsx') ? metadataTitle : `${metadataTitle}.xlsx`;
  }
  return fallback;
}
