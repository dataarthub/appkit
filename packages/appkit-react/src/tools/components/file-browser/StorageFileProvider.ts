import type { StorageAdapter, StorageObject } from '../../lib/storage/types';
import type { FileProvider, FileNode } from './types';

/**
 * 既存の StorageAdapter をラップして FileProvider インターフェースを実装するクラス。
 * 物理的なパスをそのまま使用する標準的な動作を提供します。
 */
export class StorageFileProvider implements FileProvider {
  /**
   *
   */
  constructor(private adapter: StorageAdapter) {}

  /**
   *
   */
  async listNodes(path: string): Promise<{ nodes: FileNode[]; hasMore: boolean }> {
    const result = await this.adapter.list({
      prefix: path,
      delimiter: '/',
      includeMetadata: true,
    });

    const nodes: FileNode[] = [];

    // フォルダ
    if (result.prefixes) {
      for (const prefix of result.prefixes) {
        const name = prefix.slice(path.length).replace(/\/$/, '');
        nodes.push({
          id: prefix,
          name: name,
          kind: 'folder',
        });
      }
    }

    // ファイル
    for (const obj of result.objects) {
      if (obj.key === path) continue;
      const name = obj.key.slice(path.length);
      nodes.push({
        id: obj.key,
        physicalKey: obj.key,
        name: name,
        kind: 'file',
        size: obj.size,
        contentType: obj.contentType,
        lastModified: obj.lastModified,
        metadata: obj.metadata,
        original: obj,
      });
    }

    return { nodes, hasMore: result.hasMore };
  }

  /**
   *
   */
  async uploadFile(path: string, file: File | Blob, name: string): Promise<FileNode> {
    const key = path + name;
    const result = await this.adapter.upload(key, file, {
      contentType: file.type,
    });

    return {
      id: result.key,
      physicalKey: result.key,
      name: name,
      kind: 'file',
      size: result.size,
      contentType: result.contentType,
      lastModified: result.lastModified,
      original: result,
    };
  }

  /**
   *
   */
  async createFolder(path: string, name: string): Promise<FileNode> {
    const key = path + name + '/';
    // 空のオブジェクトを作成してフォルダを表現（プロバイダーにより挙動が異なる場合あり）
    await this.adapter.upload(key, '');
    return {
      id: key,
      name: name,
      kind: 'folder',
    };
  }

  /**
   *
   */
  async getUrl(node: FileNode, options?: any): Promise<string> {
    return this.adapter.getUrl(node.physicalKey || node.id, options);
  }

  /**
   *
   */
  async deleteNodes(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.adapter.delete(id)));
  }

  /**
   *
   */
  async moveNode(id: string, newPath: string, newName?: string): Promise<FileNode> {
    if (!this.adapter.move) {
      throw new Error('This storage does not support move operation');
    }
    const name = newName || id.split('/').pop() || '';
    const destinationKey = newPath + name;
    const result = await this.adapter.move(id, destinationKey);

    return {
      id: result.key,
      physicalKey: result.key,
      name: name,
      kind: 'file',
      size: result.size,
      original: result,
    };
  }

  /**
   *
   */
  async searchNodes(criteria: { query?: string; tags?: string[] }): Promise<FileNode[]> {
    const result = await this.adapter.list({
      includeMetadata: true,
    });
    
    let nodes: FileNode[] = result.objects.map((obj: StorageObject) => ({
      id: obj.key,
      physicalKey: obj.key,
      name: obj.key.split('/').pop() || '',
      kind: 'file',
      size: obj.size,
      contentType: obj.contentType,
      lastModified: obj.lastModified,
      metadata: obj.metadata,
      original: obj,
    }));

    if (criteria.query) {
      const q = criteria.query.toLowerCase();
      nodes = nodes.filter(n => n.name.toLowerCase().includes(q));
    }

    if (criteria.tags && criteria.tags.length > 0) {
      nodes = nodes.filter(n => {
        const nodeTags = n.metadata?.tags?.split(',').map(t => t.trim()) || [];
        return criteria.tags!.every(t => nodeTags.includes(t));
      });
    }

    return nodes;
  }

  /**
   *
   */
  async renameNode(id: string, newName: string): Promise<FileNode> {
    if (!this.adapter.move) {
      throw new Error('This storage does not support move operation');
    }

    const isFolder = id.endsWith('/');
    const cleanedId = isFolder ? id.slice(0, -1) : id;
    const cleanedParts = cleanedId.split('/');
    cleanedParts.pop();
    const parentPath = cleanedParts.length > 0 ? cleanedParts.join('/') + '/' : '';
    
    return this.moveNode(id, parentPath, newName + (isFolder ? '/' : ''));
  }

  /**
   *
   */
  async updateMetadata(id: string, metadata: Record<string, string>): Promise<FileNode> {
    const head = await this.adapter.head(id);
    if (!head) {
      throw new Error(`Node not found: ${id}`);
    }
    return {
      id: head.key,
      physicalKey: head.key,
      name: head.key.split('/').pop() || '',
      kind: id.endsWith('/') ? 'folder' : 'file',
      size: head.size,
      contentType: head.contentType,
      lastModified: head.lastModified,
      metadata: { ...head.metadata, ...metadata },
      original: head,
    };
  }
}
