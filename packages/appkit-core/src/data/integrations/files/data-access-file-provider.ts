import type { StorageURLOptions } from "../../../storage/index";
import { FileProviderOperationError, type DataAccessFileProviderOptions, type FileCompensationStatus,
  type FileNode, type FileProvider, type FileRecord, type FileRecordInput, type FileSearchCriteria } from './types';

/** Normalize comma-separated tags for comparison; original metadata is preserved. */
export function parseFileTags(value: string | undefined): string[] {
  return value?.split(',').map(tag => tag.trim()).filter(Boolean) ?? [];
}
/** Portable literal search; it never interprets user input as a regex or a DB operator. */
export function matchesFileRecord(record: FileRecordInput, criteria: Readonly<FileSearchCriteria>): boolean {
  const query = criteria.query?.toLowerCase();
  if (query && !record.filename.toLowerCase().includes(query)) return false;
  const tags = new Set(parseFileTags(record.tags));
  return (criteria.tags ?? []).every(tag => tags.has(tag.trim()));
}
/**
 * Compose caller-supplied DB and storage adapters. Runtime imports need neither SDK.
 * Defaults: metadata-only deletion, portable search, retain an upload on DB failure.
 * Folder operations affect only that record; no recursive child rename/move/delete.
 * Configure authorization, exclusive key ownership and concurrency in the application.
 */
export class DataAccessFileProvider implements FileProvider {
  private readonly collection: string;
  private readonly prefix: string;
  private readonly maxSearchRecords: number;
  private readonly options: Readonly<DataAccessFileProviderOptions>;
  constructor(options: DataAccessFileProviderOptions) {
    this.options = { ...options };
    this.collection = options.collection || 'files';
    this.prefix = options.physicalPrefix || 'vault/';
    this.maxSearchRecords = options.maxSearchRecords ?? 10_000;
    if (!Number.isSafeInteger(this.maxSearchRecords) || this.maxSearchRecords < 1) throw new Error('maxSearchRecords must be a positive safe integer');
    if (options.deleteMode && !['metadata-only', 'storage-and-metadata'].includes(options.deleteMode)) throw new Error('Invalid file delete mode');
    if (options.searchMode && !['portable', 'legacy-adapter'].includes(options.searchMode)) throw new Error('Invalid file search mode');
    if (options.uploadFailurePolicy && !['retain', 'compensate'].includes(options.uploadFailurePolicy)) throw new Error('Invalid upload failure policy');
    if (options.uploadFailurePolicy === 'compensate' && typeof options.canCompensateUpload !== 'function') throw new Error('Upload compensation requires canCompensateUpload confirmation');
  }
  private newId(): string {
    const id = this.options.createId ? this.options.createId() : globalThis.crypto?.randomUUID();
    if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('A fresh safe ID is required; provide createId or Web Crypto randomUUID');
    return id;
  }
  private node(record: FileRecordInput): FileNode {
    return { id: record.id, physicalKey: record.physical_key, name: record.filename, kind: record.kind,
      size: record.size ?? undefined, contentType: record.content_type ?? undefined, lastModified: record.updated_at ? new Date(record.updated_at) : undefined,
      metadata: { tags: record.tags || '' } };
  }
  /** Existing adapter ordering: kind ascending, filename ascending. No implicit pagination cursor. */
  async listNodes(path: string): Promise<{ nodes: FileNode[]; hasMore: boolean }> {
    const records = await this.options.dataAccess.find<FileRecord>(this.collection, { folder: path }, { sort: { kind: 1, filename: 1 } });
    return { nodes: records.map(record => this.node(record)), hasMore: false };
  }
  /** Search all logical folders. Adapter/candidate callback must return the complete authorized candidate set. */
  async searchNodes(criteria: FileSearchCriteria): Promise<FileNode[]> {
    const snapshot = { ...criteria, ...(criteria.tags ? { tags: [...criteria.tags] } : {}) };
    if (this.options.searchMode === 'legacy-adapter') {
      const filter: Record<string, unknown> = {};
      if (snapshot.query) filter.filename = { $regex: snapshot.query, $options: 'i' };
      if (snapshot.tags?.length) filter.tags = { $all: snapshot.tags };
      return (await this.options.dataAccess.find<FileRecord>(this.collection, filter)).map(record => this.node(record));
    }
    const records = this.options.searchRecords
      ? await this.options.searchRecords({ ...snapshot, ...(snapshot.tags ? { tags: [...snapshot.tags] } : {}) })
      : await this.options.dataAccess.find<FileRecord>(this.collection, {}, { paginateAll: true });
    if (records.length > this.maxSearchRecords) throw new Error('File search exceeds maxSearchRecords; supply a bounded indexed candidate lookup');
    return records.filter(record => matchesFileRecord(record, snapshot)).map(record => this.node(record));
  }
  /** Delete returning false is ambiguous on some adapters; only an absent head confirms success. */
  private async deleteKey(key: string): Promise<void> {
    if (!await this.options.storage.delete(key) && await this.options.storage.head(key) !== null) throw new Error('Storage deletion was not confirmed');
  }
  /** Store under a UUID key, then create its logical record. A rejected create is reconciled via the error details. */
  async uploadFile(path: string, file: File | Blob, name: string): Promise<FileNode> {
    const id = this.newId();
    // An extension is display-derived; never allow it to add path segments to the physical key.
    const extension = /\.([^./\\\0]+)$/.exec(name)?.[1];
    const key = `${this.prefix}${id}${extension ? '.' + extension : ''}`;
    const object = await this.options.storage.upload(key, file, { contentType: file.type });
    const record: FileRecordInput = { id, folder: path, filename: name, physical_key: object.key,
      size: object.size ?? 0, content_type: object.contentType || file.type, kind: 'file', updated_at: new Date().toISOString() };
    try { await this.options.dataAccess.create(this.collection, { ...record }); }
    catch (cause) {
      let compensation: FileCompensationStatus = 'not-requested';
      let compensationError: unknown;
      if (this.options.uploadFailurePolicy === 'compensate') {
        compensation = 'retained';
        let confirmed = false;
        try {
          const existing = await this.options.dataAccess.findOne<FileRecord>(this.collection, id);
          confirmed = existing === null && await this.options.canCompensateUpload!({ cause, record: Object.freeze({ ...record }), object: Object.freeze({ ...object }) }) === true;
        } catch (error) { compensationError = error; compensation = 'unconfirmed'; }
        if (confirmed) {
          try { await this.deleteKey(object.key); compensation = 'deleted'; }
          catch (error) { compensationError = error; compensation = 'failed'; }
        }
      }
      throw new FileProviderOperationError('upload', 'create-record', { cause, nodeId: id, physicalKey: object.key, compensation, compensationError });
    }
    return this.node(record);
  }
  /** Folder metadata only, preserving the existing omitted size/content_type columns. */
  async createFolder(path: string, name: string): Promise<FileNode> {
    const record: FileRecordInput = { id: this.newId(), folder: path, filename: name, physical_key: '', kind: 'folder', updated_at: new Date().toISOString() };
    await this.options.dataAccess.create(this.collection, { ...record });
    return this.node(record);
  }
  async getUrl(node: FileNode, options?: StorageURLOptions): Promise<string> {
    if (!node.physicalKey) throw new Error('Physical key is missing for this node');
    return this.options.storage.getUrl(node.physicalKey, options);
  }
  /** Sequential, stop-on-first-failure. Physical mode is idempotent for missing records/visible keys, not atomic. */
  async deleteNodes(ids: string[]): Promise<void> {
    const requested = [...ids];
    if (this.options.deleteMode !== 'storage-and-metadata') {
      for (const id of requested) await this.options.dataAccess.delete(this.collection, id);
      return;
    }
    const completed: string[] = [];
    for (const id of requested) {
      let record: FileRecord | null;
      try {
        record = await this.options.dataAccess.findOne<FileRecord>(this.collection, id);
        if (record !== null && (!record || record.id !== id || !['file', 'folder'].includes(record.kind))) throw new Error('Invalid logical file record');
        if (record) record = { ...record };
      }
      catch (cause) { throw new FileProviderOperationError('delete', 'lookup-record', { cause, nodeId: id, completedIds: completed }); }
      if (!record) { completed.push(id); continue; }
      let storageDeleted = false;
      if (record.kind === 'file') {
        try {
          if (!record.physical_key) throw new Error('Physical key is missing for this node');
          await this.deleteKey(record.physical_key); storageDeleted = true;
        } catch (cause) { throw new FileProviderOperationError('delete', 'delete-storage', { cause, nodeId: id, physicalKey: record.physical_key, completedIds: completed }); }
      }
      try { await this.options.dataAccess.delete(this.collection, id); }
      catch (cause) { throw new FileProviderOperationError('delete', 'delete-record', { cause, nodeId: id, physicalKey: record.physical_key, storageDeleted, completedIds: completed }); }
      completed.push(id);
    }
  }
  async renameNode(id: string, newName: string): Promise<FileNode> {
    return this.node(await this.options.dataAccess.update<FileRecord>(this.collection, id, { filename: newName, updated_at: new Date().toISOString() }));
  }
  async moveNode(id: string, newPath: string): Promise<FileNode> {
    return this.node(await this.options.dataAccess.update<FileRecord>(this.collection, id, { folder: newPath, updated_at: new Date().toISOString() }));
  }
  /** Only tags are persisted; this interface does not promise arbitrary DB metadata columns. */
  async updateMetadata(id: string, metadata: Record<string, string>): Promise<FileNode> {
    return this.node(await this.options.dataAccess.update<FileRecord>(this.collection, id, {
      updated_at: new Date().toISOString(), ...(metadata.tags !== undefined ? { tags: metadata.tags } : {}),
    }));
  }
}
