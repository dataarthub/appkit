import * as React from 'react';
import { cn } from '../../lib/utils';

export interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fixed header content */
  header?: React.ReactNode;
  /** Fixed footer content */
  footer?: React.ReactNode;
  /** Left sidebar content */
  leftSidebar?: React.ReactNode;
  /** Right pane content */
  rightPane?: React.ReactNode;
  /** Whether the left sidebar is collapsed (affects width helper if used, though usually controlled by the sidebar component itself) */
  isLeftSidebarCollapsed?: boolean;
  /** Whether the right pane is visible */
  isRightPaneVisible?: boolean;
  /** Whether the main area is scrollable (overflow-y-auto). Default: true */
  scrollable?: boolean;
  /** Whether the main area text is selectable. Default: true */
  selectable?: boolean;
  /** Position of the header. 'top' (default) puts sidebar below header. 'right-of-sidebar' puts header to the right of sidebar. */
  headerPosition?: 'top' | 'right-of-sidebar';
}

/**
 * A flexible layout component with fixed header/footer and growing main area.
 * Uses Flexbox for layout (h-screen, flex-col, flex-1) rather than sticky positioning.
 */
export const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  (
    {
      className,
      header,
      footer,
      leftSidebar,
      rightPane,
      children,
      isLeftSidebarCollapsed: _isLeftSidebarCollapsed = false,
      isRightPaneVisible = true,
      scrollable = true,
      'aria-label': mainLabel = 'Main content',
      selectable = true,
      headerPosition = 'top',
      ...props
    },
    ref,
  ) => {
    const HeaderContent = header && <div className='flex-none z-10 w-full'>{header}</div>;

    const FooterContent = footer && <div className='flex-none z-10 w-full'>{footer}</div>;

    // Render sidebar directly without aside wrapper - Sidebar component has its own container structure
    const SidebarContent = leftSidebar;

    const RightPaneContent = rightPane && isRightPaneVisible && (
      <aside className='flex-none overflow-y-auto border-l w-96 max-w-full absolute lg:relative right-0 top-0 bottom-0 h-full z-20 bg-background shadow-2xl lg:shadow-none'>
        {rightPane}
      </aside>
    );

    const MainContent = (
      <main
        aria-label={mainLabel}
        tabIndex={scrollable ? 0 : undefined}
        className={cn(
          'flex-1 min-w-0 flex flex-col',
          scrollable ? 'overflow-y-auto' : 'overflow-hidden',
          !selectable && 'select-none',
        )}
      >
        {children}
      </main>
    );

    if (headerPosition === 'right-of-sidebar') {
      return (
        <div
          ref={ref}
          className={cn(
            'flex h-screen w-screen overflow-hidden bg-background text-foreground',
            className,
          )}
          {...props}
        >
          {SidebarContent}
          <div className='flex flex-col flex-1 min-w-0 overflow-hidden'>
            {HeaderContent}
            <div className='flex flex-1 overflow-hidden relative'>
              {MainContent}
              {RightPaneContent}
            </div>
            {FooterContent}
          </div>
        </div>
      );
    }

    // Default: headerPosition === 'top'
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground',
          className,
        )}
        {...props}
      >
        {HeaderContent}
        <div className='flex flex-1 overflow-hidden relative'>
          {SidebarContent}
          {MainContent}
          {RightPaneContent}
        </div>
        {FooterContent}
      </div>
    );
  },
);
Layout.displayName = 'Layout';
