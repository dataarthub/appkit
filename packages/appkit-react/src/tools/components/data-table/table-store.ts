/**
 * @fileoverview DataTable settings persistence store using Zustand
 *
 * Provides persistent storage for table settings like column order,
 * visibility, sorting state, and page size per table key.
 *
 * @module data-table/table-store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SortingState } from './table-engine';

// =============================================================================
// Types
// =============================================================================

/**
 * 個別テーブルの設定
 * Settings for a single table instance
 *
 * @typedef {Object} TableSettings
 * @property {string[]} columnOrder - カラムの表示順序 / Column display order
 * @property {Record<string, boolean>} columnVisibility - カラムの表示/非表示設定 / Column visibility
 * @property {SortingState} sorting - ソート状態 / Current sorting state
 * @property {number} pageSize - ページサイズ / Items per page
 */
export interface TableSettings {
  /** カラムの表示順序 / Column display order */
  columnOrder: string[];
  /** カラムの表示/非表示設定 / Column visibility settings */
  columnVisibility: Record<string, boolean>;
  /** ソート状態 / Sorting state */
  sorting: SortingState;
  /** ページサイズ / Page size */
  pageSize: number;
}

/**
 * デフォルトのテーブル設定
 * Default table settings applied when no stored settings exist
 * @constant
 */
export const defaultSettings: TableSettings = {
  columnOrder: [],
  columnVisibility: {},
  sorting: [],
  pageSize: 10,
};

/**
 * 名前付き保存ビュー
 * Named saved view containing specific settings
 */
export interface SavedView {
  id: string;
  name: string;
  settings: Partial<TableSettings>;
  filterValues?: Record<string, unknown>;
}

/**
 * DataTableストアの状態
 * DataTable store state interface
 */
interface DataTableStoreState {
  /** テーブルキーごとの設定 / Settings indexed by table key */
  tables: Record<string, Partial<TableSettings>>;
  /** テーブルキーごとの保存済みビュー / Saved views indexed by table key */
  savedViews: Record<string, SavedView[]>;
  /** テーブルキーごとの現在アクティブなビューID / Currently active view ID */
  activeViewIds: Record<string, string | null>;
}

/**
 * DataTableストアのアクション
 * DataTable store action methods
 */
interface DataTableStoreActions {
  /**
   * テーブル設定を取得する
   * Gets settings for a table, merged with defaults
   *
   * @param {string} key - テーブルの一意識別子 / Unique table identifier
   * @returns {TableSettings} デフォルトとマージされた設定 / Settings merged with defaults
   */
  getTableSettings: (key: string) => TableSettings;

  /**
   * テーブル設定を更新する
   * Updates settings for a table (partial update supported)
   *
   * @param {string} key - テーブルの一意識別子 / Unique table identifier
   * @param {Partial<TableSettings>} settings - 更新する設定 / Settings to update
   * @returns {void}
   */
  setTableSettings: (key: string, settings: Partial<TableSettings>) => void;

  /**
   * 現在の状態を新しいビューとして保存する
   * Saves current settings and filters as a named view
   */
  saveView: (
    key: string,
    name: string,
    settings: Partial<TableSettings>,
    filterValues?: Record<string, unknown>,
  ) => string;

  /**
   * 既存のビューを更新する
   * Updates an existing saved view
   */
  updateView: (
    key: string,
    viewId: string,
    settings: Partial<TableSettings>,
    filterValues?: Record<string, unknown>,
  ) => void;

  /**
   * 保存済みビューを削除する
   * Deletes a saved view
   */
  deleteView: (key: string, viewId: string) => void;

  /**
   * アクティブなビューIDを設定する
   * Sets the currently active view ID
   */
  setActiveView: (key: string, viewId: string | null) => void;

  /**
   * テーブル設定をクリアする
   * Clears all stored settings for a specific table
   *
   * @param {string} key - テーブルの一意識別子 / Unique table identifier
   * @returns {void}
   */
  clearTableSettings: (key: string) => void;

  /**
   * すべてのテーブル設定をクリアする
   * Clears all stored table settings
   *
   * @returns {void}
   */
  clearAllSettings: () => void;
}

/**
 * Store hydration state
 */
interface DataTableStoreHydration {
  /** Whether the store has been hydrated from localStorage */
  _hasHydrated: boolean;
  /** Set hydration status */
  _setHasHydrated: (state: boolean) => void;
}

/** Combined store type */
type DataTableStore = DataTableStoreState & DataTableStoreActions & DataTableStoreHydration;

// =============================================================================
// Store
// =============================================================================

/**
 * DataTableの設定を永続化するZustandストア
 * Zustand store for persisting DataTable settings to localStorage
 *
 * Settings are stored per table key and automatically persisted.
 * Use `storageKey` prop on DataTable to enable persistence.
 *
 * @example
 * // Get settings for a table
 * const settings = useDataTableStore(state => state.getTableSettings('users-table'));
 * console.log(settings.pageSize); // 10 (default) or stored value
 *
 * @example
 * // Update settings
 * const setSettings = useDataTableStore(state => state.setTableSettings);
 * setSettings('users-table', { pageSize: 25 });
 *
 * @example
 * // Clear settings for a table
 * const clearSettings = useDataTableStore(state => state.clearTableSettings);
 * clearSettings('users-table');
 */
export const useDataTableStore = create<DataTableStore>()(
  persist(
    (set, get) => ({
      tables: {},
      savedViews: {},
      activeViewIds: {},
      _hasHydrated: false,

      _setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      getTableSettings: (key: string): TableSettings => {
        const stored = get().tables[key];
        return {
          ...defaultSettings,
          ...stored,
        };
      },

      setTableSettings: (key: string, settings: Partial<TableSettings>) => {
        set((state) => ({
          tables: {
            ...state.tables,
            [key]: {
              ...state.tables[key],
              ...settings,
            },
          },
        }));
      },

      saveView: (
        key: string,
        name: string,
        settings: Partial<TableSettings>,
        filterValues?: Record<string, unknown>,
      ) => {
        const viewId = crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 9);
        const newView: SavedView = {
          id: viewId,
          name,
          settings,
          filterValues,
        };

        set((state) => ({
          savedViews: {
            ...state.savedViews,
            [key]: [...(state.savedViews[key] || []), newView],
          },
          activeViewIds: {
            ...state.activeViewIds,
            [key]: viewId,
          },
        }));

        return viewId;
      },

      updateView: (
        key: string,
        viewId: string,
        settings: Partial<TableSettings>,
        filterValues?: Record<string, unknown>,
      ) => {
        set((state) => {
          const views = state.savedViews[key] || [];
          const updatedViews = views.map((v) =>
            v.id === viewId
              ? {
                  ...v,
                  settings: { ...v.settings, ...settings },
                  filterValues: filterValues !== undefined ? filterValues : v.filterValues,
                }
              : v,
          );

          return {
            savedViews: {
              ...state.savedViews,
              [key]: updatedViews,
            },
          };
        });
      },

      deleteView: (key: string, viewId: string) => {
        set((state) => {
          const views = state.savedViews[key] || [];
          const filteredViews = views.filter((v) => v.id !== viewId);

          // If we're deleting the active view, unset the active view
          const activeViewIds = { ...state.activeViewIds };
          if (activeViewIds[key] === viewId) {
            activeViewIds[key] = null;
          }

          return {
            savedViews: {
              ...state.savedViews,
              [key]: filteredViews,
            },
            activeViewIds,
          };
        });
      },

      setActiveView: (key: string, viewId: string | null) => {
        set((state) => ({
          activeViewIds: {
            ...state.activeViewIds,
            [key]: viewId,
          },
        }));
      },

      clearTableSettings: (key: string) => {
        set((state) => {
          const { [key]: _, ...rest } = state.tables;
          return { tables: rest };
        });
      },

      clearAllSettings: () => {
        set({ tables: {}, savedViews: {}, activeViewIds: {} });
      },
    }),
    {
      name: 'tools-data-table-storage',
      version: 1,
      storage: createJSONStorage(() => {
        // SSR-safe: Return no-op storage on server
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      // Skip hydration on server - hydrate only on client
      skipHydration: typeof window === 'undefined',
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);
