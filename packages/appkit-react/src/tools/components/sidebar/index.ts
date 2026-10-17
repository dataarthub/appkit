export * from './SmartSidebar';
export * from './sidebar';
export * from './useSidebar';
export { Sidebar, useSidebarCompoundContext } from './sidebar-compound';
export type {
  SidebarCompoundContextValue,
  SidebarRootProps,
  SidebarHeaderProps,
  SidebarContentProps,
  SidebarGroupProps,
  SidebarItemProps,
  SidebarFooterProps,
} from './sidebar-compound';

/** Primitive sidebar for layouts that do not use the compound Sidebar namespace. */
export { Sidebar as SidebarPrimitive } from './sidebar';
