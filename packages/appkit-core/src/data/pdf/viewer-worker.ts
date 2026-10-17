/** Resolve the ESM worker used by the supported PDF.js 6.x peer. */
export function resolvePdfWorkerSrc(version: string, workerSrc?: string): string {
  if (workerSrc !== undefined) {
    if (!workerSrc.trim()) throw new Error('PDF workerSrc must not be empty');
    return workerSrc;
  }
  return `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
}
