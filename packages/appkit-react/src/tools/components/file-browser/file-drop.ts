import type {FileNode} from './types';
interface FileDrop {
  canceled: boolean;
  operation: {
    source: {id: string | number; data: Record<string, unknown>} | null | undefined;
    target: {id: string | number; data: Record<string, unknown>} | null | undefined;
  };
}
/** Resolve against the live listing, not the metadata captured before navigation. */
export function resolveFileDrop(event: FileDrop, nodes: readonly FileNode[]) {
  const {source, target} = event.operation;
  if (event.canceled || !source || !target) return null;
  const file = nodes.find(node => node.id === source.id);
  const folder = nodes.find(node => node.id === target.id);
  if (!file || !folder || file.kind !== 'file' || folder.kind !== 'folder') return null;
  if (source.data.id !== file.id || source.data.kind !== 'file' || target.data.id !== folder.id || target.data.kind !== 'folder') return null;
  const targetPath = folder.id.endsWith('/') ? folder.id : `${folder.id}/`;
  if (file.id.startsWith(targetPath)) return null;
  return {nodeId: file.id, targetPath};
}
