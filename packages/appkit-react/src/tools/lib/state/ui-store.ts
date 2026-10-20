import { createPersistedStore } from './store-factory';

/**
 * Persisted sidebar/pane display preferences; see useUIStore.
 */
interface UIState {
  /**
   * Whether the left sidebar is collapsed; defaults to false.
   */
  isLeftSidebarCollapsed: boolean;
  /**
   * Whether the right pane is visible; defaults to false.
   */
  isRightPaneVisible: boolean;
  /**
   * Set the left-sidebar display preference.
   * @param collapsed - Desired collapsed state.
   * @returns No value after store update.
   */
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  /**
   * Set the right-pane display preference.
   * @param visible - Desired pane visibility.
   * @returns No value after store update.
   */
  setRightPaneVisible: (visible: boolean) => void;
  /**
   * Invert the left-sidebar collapsed flag.
   * @returns No value after store update.
   */
  toggleLeftSidebar: () => void;
  /**
   * Invert the right-pane visibility flag.
   * @returns No value after store update.
   */
  toggleRightPane: () => void;
}

/**
 * Reads and updates module-shared sidebar/pane preferences persisted under tools-ui-storage.
 * @param selector - Optional Zustand selector; omission returns the complete state.
 * @returns Selected store value with updates subscribed through Zustand.
 * @remarks Uses createPersistedStore version 1; server defaults are both false and browser
 * storage may hydrate different values. No provider/CSS required to consume state.
 * @example
 * ```tsx
 * import { useUIStore } from '@alneas/appkit-react/tools/core';
 * export function PaneToggle() { const toggle = useUIStore(state => state.toggleRightPane); return <button onClick={toggle}>Toggle pane</button>; }
 * ```
 */
export const useUIStore = createPersistedStore<UIState>(
  (set) => ({
    isLeftSidebarCollapsed: false,
    isRightPaneVisible: false,
    setLeftSidebarCollapsed: (collapsed) => set({ isLeftSidebarCollapsed: collapsed }),
    setRightPaneVisible: (visible) => set({ isRightPaneVisible: visible }),
    toggleLeftSidebar: () =>
      set((state) => ({ isLeftSidebarCollapsed: !state.isLeftSidebarCollapsed })),
    toggleRightPane: () => set((state) => ({ isRightPaneVisible: !state.isRightPaneVisible })),
  }),
  {
    name: 'tools-ui-storage',
  },
);
