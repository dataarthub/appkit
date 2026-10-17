import { DataAccessFileProvider as CoreFileProvider, FileProviderOperationError,
  type DataAccessFileProviderOptions, type FileNode } from "@alneas/appkit-core/data";
export type { DataAccessFileProviderOptions, FileRecord } from "@alneas/appkit-core/data";
export { FileProviderOperationError } from "@alneas/appkit-core/data";

/** Private compatibility: preserve regex/$all search, retained uploads and original DB create errors by default. */
export class DataAccessFileProvider extends CoreFileProvider {
  private readonly retainLegacyErrors: boolean;
  /** Shared DB/blob implementation with the private search and ID defaults. */
  constructor(options: DataAccessFileProviderOptions) {
    super({ ...options, searchMode: options.searchMode ?? 'legacy-adapter',
      createId: options.createId ?? (() => globalThis.crypto?.randomUUID?.() ??
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)) });
    this.retainLegacyErrors = !options.uploadFailurePolicy || options.uploadFailurePolicy === 'retain';
  }
  /** Retain the original create failure identity unless compensation is explicitly enabled. */
  override async uploadFile(path: string, file: File | Blob, name: string): Promise<FileNode> {
    try { return await super.uploadFile(path, file, name); }
    catch (error) {
      if (this.retainLegacyErrors && error instanceof FileProviderOperationError && error.operation === 'upload' && error.stage === 'create-record') throw (error as FileProviderOperationError & { cause: unknown }).cause;
      throw error;
    }
  }
  /** Preserve the former open URL-options signature for provider-specific callers. */
  override getUrl(node: FileNode, options?: any): Promise<string> { return super.getUrl(node, options); }
}
