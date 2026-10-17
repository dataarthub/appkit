import { createPersistedStore } from './store-factory';

interface UIState {
  isLeftSidebarCollapsed: boolean;
  isRightPaneVisible: boolean;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  setRightPaneVisible: (visible: boolean) => void;
  toggleLeftSidebar: () => void;
  toggleRightPane: () => void;
}

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
