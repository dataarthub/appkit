import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Viewport regions and flex/scroll options for Layout.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see Layout
 */
export interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Content in the non-scrolling top flex region; omitted means no header.
   */
  header?: React.ReactNode;
  /**
   * Content in the non-scrolling bottom flex region; omitted means no footer.
   */
  footer?: React.ReactNode;
  /**
   * Sidebar element rendered directly; it controls its own width and collapse behavior.
   */
  leftSidebar?: React.ReactNode;
  /**
   * Optional content in the right aside, visible when isRightPaneVisible is true.
   */
  rightPane?: React.ReactNode;
  /**
   * Compatibility flag accepted but ignored by Layout; it does not change sidebar width.
   */
  isLeftSidebarCollapsed?: boolean;
  /**
   * Whether rightPane is mounted; defaults to true.
   */
  isRightPaneVisible?: boolean;
  /**
   * Enables overflow-y-auto on the main area; defaults to true.
   */
  scrollable?: boolean;
  /**
   * Allows main-area text selection; defaults to true, false adds select-none.
   */
  selectable?: boolean;
  /**
   * top places header above sidebar; right-of-sidebar places it beside sidebar. Defaults to top.
   */
  headerPosition?: 'top' | 'right-of-sidebar';
}

/**
 * Divides the viewport into fixed flex header/footer, a growing main area and optional side panes.
 * @param props - Component attributes and children accepted by the declared native/underlying prop type; className customizes wrapper styling. Wrapper defaults: _isLeftSidebarCollapsed=false, isRightPaneVisible=true, scrollable=true, selectable=true, headerPosition='top'.
 * @returns The rendered Layout composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. The root uses h-screen/w-screen and clips overflow. scrollable and selectable default to true; the right pane overlays content below lg and sits in normal layout from lg. headerPosition defaults to top; right-of-sidebar moves header/footer beside the sidebar. isLeftSidebarCollapsed is accepted but ignored; the supplied sidebar owns its own collapse behavior. The ref prop forwards to the rendered control or container declared by the component ref type.
 * @example
 * ```tsx
 * import { Layout } from '@alneas/appkit-react/ui';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<Layout header={<header>Project</header>} footer={<footer>Status</footer>} leftSidebar={<nav>Navigation</nav>} rightPane={<aside>Details</aside>}><p>Main content</p></Layout>);
 * }
 * ```
 */
export function Layout({
  ref,
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
}: React.PropsWithoutRef<LayoutProps> & React.RefAttributes<HTMLDivElement>) {
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
}
Layout.displayName = 'Layout';
