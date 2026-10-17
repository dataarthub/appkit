import { useState, useCallback, useEffect } from 'react';
import type {
  FileProvider,
  FileBrowserState,
  FileNode,
  FileBrowserViewMode,
  FileGroupingAxis,
} from './types';

export interface UseStorageBrowserOptions {
  /** ファイルプロバイダー（DB+ストレージの抽象化） */
  provider: FileProvider;
  /** 初期パス */
  initialPath?: string;
  /** 初期表示モード */
  initialViewMode?: FileBrowserViewMode;
  /** グループ化の軸（仮想ツリー用、将来拡張用） */
  groupingAxis?: FileGroupingAxis;
}

/**
 * ストレージをブラウズするためのカスタムフック
 */
export function useStorageBrowser({
  provider,
  initialPath = '',
  initialViewMode = 'grid',
  groupingAxis: _groupingAxis,
}: UseStorageBrowserOptions) {
  const [state, setState] = useState<FileBrowserState>({
    path: initialPath,
    nodes: [],
    isLoading: false,
    selectedIds: [],
    viewMode: initialViewMode,
  });
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * データを読み込む
   */
  const load = useCallback(
    async (path: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
      setSearchQuery('');

      try {
        const { nodes, hasMore: _hasMore } = await provider.listNodes(path);
        setState((prev) => ({ ...prev, path, nodes, isLoading: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'データの読み込みに失敗しました',
        }));
      }
    },
    [provider],
  );

  /**
   * 検索を実行する
   */
  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        void load(state.path);
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
      setSearchQuery(query);

      try {
        const nodes = await provider.searchNodes({ query });
        setState((prev) => ({ ...prev, nodes, isLoading: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : '検索に失敗しました',
        }));
      }
    },
    [provider, load, state.path],
  );

  // 初回読み込み
  useEffect(() => {
    void load(initialPath);
  }, [load, initialPath]);

  /**
   * フォルダへの移動
   */
  const navigate = useCallback(
    (path: string) => {
      void load(path);
    },
    [load],
  );

  /**
   * 1つ上の階層へ移動
   */
  const navigateUp = useCallback(() => {
    if (!state.path) return;
    const parts = state.path.replace(/\/$/, '').split('/');
    parts.pop();
    const parentPath = parts.length > 0 ? parts.join('/') + '/' : '';
    navigate(parentPath);
  }, [state.path, navigate]);

  /**
   * ノードを開く（フォルダなら移動、ファイルならURL取得）
   */
  const openNode = useCallback(
    async (node: FileNode) => {
      if (node.kind === 'folder') {
        navigate(node.id.endsWith('/') ? node.id : `${node.id}/`);
        return null;
      } else {
        return provider.getUrl(node);
      }
    },
    [navigate, provider],
  );

  /**
   * 表示モードの切り替え
   */
  const setViewMode = useCallback((mode: FileBrowserViewMode) => {
    setState((prev) => ({ ...prev, viewMode: mode }));
  }, []);

  /**
   * 選択状態の更新
   */
  const select = useCallback((ids: string[]) => {
    setState((prev) => ({ ...prev, selectedIds: ids }));
  }, []);

  /**
   * リフレッシュ
   */
  const refresh = useCallback(() => {
    if (searchQuery) {
      void search(searchQuery);
    } else {
      void load(state.path);
    }
  }, [load, search, state.path, searchQuery]);

  /**
   * ファイル削除
   */
  const deleteNodes = useCallback(
    async (ids: string[]) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        await provider.deleteNodes(ids);
        refresh();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : '削除に失敗しました',
        }));
      }
    },
    [provider, refresh],
  );

  /**
   * 名前変更
   */
  const renameNode = useCallback(
    async (id: string, newName: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        await provider.renameNode(id, newName);
        refresh();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : '名前の変更に失敗しました',
        }));
      }
    },
    [provider, refresh],
  );

  /**
   * タグ更新
   */
  const updateTags = useCallback(
    async (id: string, tags: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        await provider.updateMetadata(id, { tags });
        refresh();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'タグの更新に失敗しました',
        }));
      }
    },
    [provider, refresh],
  );

  const [verifyingIds, setVerifyingIds] = useState<
    Record<string, { loading: boolean; valid?: boolean; error?: string }>
  >({});

  /**
   * 整合性検証を実行する
   */
  const verifyNode = useCallback(
    async (id: string) => {
      if (!provider.verifyIntegrity) return;

      setVerifyingIds((prev) => ({ ...prev, [id]: { loading: true } }));

      try {
        const result = await provider.verifyIntegrity(id);
        setVerifyingIds((prev) => ({
          ...prev,
          [id]: { loading: false, valid: result.valid, error: result.error },
        }));
      } catch (error) {
        setVerifyingIds((prev) => ({
          ...prev,
          [id]: {
            loading: false,
            valid: false,
            error: error instanceof Error ? error.message : '検証に失敗しました',
          },
        }));
      }
    },
    [provider],
  );

  return {
    state,
    searchQuery,
    verifyingIds,
    navigate,
    navigateUp,
    search,
    openNode,
    setViewMode,
    select,
    refresh,
    deleteNodes,
    renameNode,
    updateTags,
    verifyNode,
  };
}
