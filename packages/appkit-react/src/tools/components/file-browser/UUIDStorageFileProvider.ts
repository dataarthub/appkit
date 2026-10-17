import type { StorageAdapter } from '../../lib/storage/types';
import type { FileProvider, FileNode } from './types';

export interface UUIDStorageFileProviderOptions {
  /** 物理ストレージ */
  adapter: StorageAdapter;
  /** DBからノード一覧を取得する関数（外部から注入） */
  listNodes: (path: string) => Promise<{ nodes: FileNode[]; hasMore: boolean }>;
  /** 物理削除を行うかどうか（falseの場合は論理削除のみを想定） */
  physicalDelete?: boolean;
  /** ノードが作成（アップロード）された時のコールバック */
  onNodeCreated?: (node: FileNode) => Promise<void>;
  /** ノードが削除された時のコールバック */
  onNodesDeleted?: (ids: string[]) => Promise<void>;
}

/**
 * DB管理 + ストレージUUID名の構成に対応する FileProvider。
 */
export class UUIDStorageFileProvider implements FileProvider {
  /**
   *
   */
  constructor(private options: UUIDStorageFileProviderOptions) {}

  /**
   *
   */
  async listNodes(path: string): Promise<{ nodes: FileNode[]; hasMore: boolean }> {
    // DB経由で一覧を取得
    return this.options.listNodes(path);
  }

  /**
   *
   */
  async uploadFile(path: string, file: File | Blob, name: string): Promise<FileNode> {
    // 1. UUIDを生成して物理キーを決定
    const uuid =
      typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const extension = name.includes('.') ? `.${name.split('.').pop()}` : '';
    const physicalKey = `vault/${uuid}${extension}`;

    // 2. 物理ストレージに保存
    const result = await this.options.adapter.upload(physicalKey, file, {
      contentType: file.type,
      metadata: {
        'original-name': name,
        'logical-path': path,
      },
    });

    // 3. 論理ノードの作成
    const node: FileNode = {
      id: uuid, // DBの主キー等
      physicalKey: result.key,
      name: name,
      kind: 'file',
      size: result.size,
      contentType: result.contentType,
      lastModified: result.lastModified,
      metadata: result.metadata,
      original: result,
    };

    // 4. DB保存コールバック
    if (this.options.onNodeCreated) {
      await this.options.onNodeCreated(node);
    }

    return node;
  }

  /**
   *
   */
  async createFolder(_path: string, name: string): Promise<FileNode> {
    // フォルダはDB上の概念のみとする（ストレージには何も作成しない）
    const node: FileNode = {
      id: `dir-${Date.now()}`, // 本来はDBで採番
      name: name,
      kind: 'folder',
    };

    if (this.options.onNodeCreated) {
      await this.options.onNodeCreated(node);
    }

    return node;
  }

  /**
   *
   */
  async getUrl(node: FileNode, options?: any): Promise<string> {
    if (!node.physicalKey) {
      throw new Error('Physical key is missing for this node');
    }
    return this.options.adapter.getUrl(node.physicalKey, options);
  }

  /**
   *
   */
  async deleteNodes(ids: string[]): Promise<void> {
    // 1. DB削除コールバック（論理削除等）
    if (this.options.onNodesDeleted) {
      await this.options.onNodesDeleted(ids);
    }

    // 2. 物理削除（オプション）
    if (this.options.physicalDelete) {
      // 本来的には physicalKey を引いて削除する必要があるが、
      // 簡易化のため ID=physicalKey と想定するか、別途 metadata から取得する設計が必要
      // ここでは DB コールバック側で物理削除もハンドリングすることを推奨
    }
  }

  /**
   *
   */
  async moveNode(_id: string, _newPath: string, _newName?: string): Promise<FileNode> {
    // DB上のパスや名前を更新するだけなので、物理的な move は不要
    // (UUIDは変わらない)
    throw new Error('Not implemented: moveNode for UUID provider');
  }

  /**
   *
   */
  async searchNodes(_criteria: { query?: string; tags?: string[] }): Promise<FileNode[]> {
    throw new Error('Not implemented: searchNodes for UUID provider');
  }

  /**
   *
   */
  async renameNode(_id: string, _newName: string): Promise<FileNode> {
    throw new Error('Not implemented: renameNode for UUID provider');
  }

  /**
   *
   */
  async updateMetadata(_id: string, _metadata: Record<string, string>): Promise<FileNode> {
    throw new Error('Not implemented: updateMetadata for UUID provider');
  }
}
