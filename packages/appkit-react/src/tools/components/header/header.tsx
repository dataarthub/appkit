import * as React from 'react';
import { Menu } from 'lucide-react';
import { Button, buttonVariants } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  ThemeSwitcherGroup,
  ThemeModeSwitcher,
  ColorThemeSwitcher,
  SpacingThemeSwitcher,
} from "../theme";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { cn } from "../../lib/utils";
import { SidebarTrigger } from "../sidebar/sidebar";
import type { Locale } from '../../paraglide/runtime.js';

/**
 * Host inputs and presentation settings for Header.
 * @remarks Inherited native or primitive props keep their upstream types and behavior; this declaration documents only the wrapper-owned options.
 * @see Header
 */
export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Optional logo content shown beside title.
   */
  logo?: React.ReactNode;
  /**
   * Application title; hidden below md when logo is present.
   */
  title?: string;
  /**
   * Sheet-menu placement; defaults to right.
   */
  menuPosition?: 'left' | 'right';
  /**
   * Sheet-menu entries; empty/omitted means no sheet trigger. href entries use anchors, otherwise Buttons.
   */
  menuItems?: { /**
   * Visible text for the navigation/menu entry.
   */
  label: string; /**
   * Host action invoked when this entry is clicked; the host owns any navigation or asynchronous work.
   * @returns No value; complete the host callback action.
   */
  onClick?: () => void; /**
   * Optional anchor destination; no router integration or authorization checks are installed.
   */
  href?: string; /**
   * Optional leading sheet-menu icon; user-menu icon fields are currently ignored.
   */
  icon?: React.ReactNode }[];
  /**
   * Desktop-only navigation anchors; the host supplies href/onClick and active state.
   */
  navItems?: { /**
   * Visible text for the navigation/menu entry.
   */
  label: string; /**
   * Host action invoked when this entry is clicked; the host owns any navigation or asynchronous work.
   * @returns No value; complete the host callback action.
   */
  onClick?: () => void; /**
   * Optional anchor destination; no router integration or authorization checks are installed.
   */
  href?: string; /**
   * Adds desktop navigation active styling when true; omitted/false uses inactive styling.
   */
  active?: boolean }[];
  /**
   * Host-supplied profile display data; omitted hides the avatar menu. It is not validated as authenticated identity.
   */
  user?: {
    /**
     * User display name; also supplies the two-character uppercase avatar fallback.
     */
    name: string;
    /**
     * Optional user email shown in the avatar menu.
     */
    email?: string;
    /**
     * Optional avatar image URL; missing/failing images use the fallback.
     */
    image?: string;
    /**
     * Optional avatar fallback text; falsy values use the first two name characters.
     */
    initials?: string;
  };
  /**
   * Avatar dropdown entries; href creates an anchor and onClick is attached to the menu item. Accepted icon fields are currently ignored.
   */
  userMenuItems?: { /**
   * Visible text for the navigation/menu entry.
   */
  label: string; /**
   * Host action invoked when this entry is clicked; the host owns any navigation or asynchronous work.
   * @returns No value; complete the host callback action.
   */
  onClick?: () => void; /**
   * Optional anchor destination; no router integration or authorization checks are installed.
   */
  href?: string; /**
   * Optional leading sheet-menu icon; user-menu icon fields are currently ignored.
   */
  icon?: React.ReactNode }[];
  /**
   * Called from the optional logout menu item; the host performs logout and invalidates its own session/cache.
   * @returns No value; complete the host callback action.
   */
  onLogout?: () => void;
  /**
   * Shows the main and sheet theme-mode controls; defaults to true.
   */
  showThemeToggle?: boolean;
  /**
   * Shows the main and sheet palette controls; defaults to true.
   */
  showColorToggle?: boolean;
  /**
   * Shows the main and sheet spacing controls; defaults to true.
   */
  showSpaceToggle?: boolean;
  /**
   * Shows the main and sheet locale toggles; defaults to true.
   */
  showLanguageToggle?: boolean;
  /**
   * Controlled locale callback forwarded only to the main header toggle; the sheet toggle uses global runtime behavior.
   * @param lang - Host callback input described above.
   * @returns No value; complete the host callback action.
   */
  onLanguageChange?: (lang: Locale) => void;
  /**
   * Locale override forwarded only to the main header toggle; omitted reads runtime state.
   */
  currentLanguage?: Locale;
  /**
   * Additional action content displayed in the right action group.
   */
  actions?: React.ReactNode;
}

type MenuItem = NonNullable<HeaderProps['menuItems']>[number];

const MobileMenu: React.FC<{
  menuItems: MenuItem[];
  isMenuLeft: boolean;
  showThemeToggle: boolean;
  showColorToggle: boolean;
  showSpaceToggle: boolean;
  showLanguageToggle: boolean;
}> = ({
  menuItems,
  isMenuLeft,
  showThemeToggle,
  showColorToggle,
  showSpaceToggle,
  showLanguageToggle,
}) => (
  <Sheet>
    <SheetTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'shrink-0')}>
      <Menu className='h-5 w-5' />
      <span className='sr-only'>Toggle menu</span>
    </SheetTrigger>
    <SheetContent side={isMenuLeft ? 'left' : 'right'}>
      <SheetHeader>
        <SheetTitle>Menu</SheetTitle>
      </SheetHeader>
      <div className='grid gap-4 py-4'>
        {menuItems.map((item, index) => (
          <React.Fragment key={index}>
            {item.href ? (
              <a
                href={item.href}
                className={cn(buttonVariants({ variant: 'ghost' }), 'justify-start')}
                onClick={item.onClick}
              >
                {item.icon && <span className='mr-2'>{item.icon}</span>}
                {item.label}
              </a>
            ) : (
              <Button variant='ghost' className='justify-start' onClick={item.onClick}>
                {item.icon && <span className='mr-2'>{item.icon}</span>}
                {item.label}
              </Button>
            )}
          </React.Fragment>
        ))}
        {(showThemeToggle || showColorToggle || showSpaceToggle) && (
          <>
            <div className='h-px bg-border my-2' />
            <div className='px-2'>
              <ThemeSwitcherGroup
                showThemeMode={showThemeToggle}
                showColorTheme={showColorToggle}
                showSpacingTheme={showSpaceToggle}
                modeVariant='icon-group'
                colorVariant='icon-group'
                spacingVariant='icon-group'
              />
            </div>
          </>
        )}
        {showLanguageToggle && (
          <div className='px-2'>
            <LanguageSwitcher />
          </div>
        )}
      </div>
    </SheetContent>
  </Sheet>
);

/**
 * Renders a sticky application header with navigation, theme/locale controls and an optional user menu.
 * @param props - Header configuration and native header attributes; className customizes styling, and children are replaced by the built-in layout. Wrapper defaults: menuPosition='right', menuItems=[], navItems=[], userMenuItems=[], showThemeToggle=true, showColorToggle=true, showSpaceToggle=true, showLanguageToggle=true.
 * @returns The rendered Header composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS. SidebarProvider is required because the header always renders SidebarTrigger, even when hidden by desktop CSS. ThemeProvider supplies working theme controls; locale updates follow LanguageSwitcher. The host owns routing, identity data and logout effects; user is display data, not proof of an authenticated session. Header children are replaced by its built-in layout. navItems are desktop-only anchors; menuItems populate the sheet menu. The sheet language switcher does not receive currentLanguage/onLanguageChange, so those props control only the main header switcher. userMenuItems.icon is accepted but not rendered.
 * @example
 * ```tsx
 * import { ThemeProvider } from '@alneas/appkit-react/ui/theme';
 * import { SidebarProvider } from '@alneas/appkit-react/tools/sidebar';
 * import { Header } from '@alneas/appkit-react/tools/header';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   return (<ThemeProvider><SidebarProvider><Header title="Project" navItems={[{ label: "Home", href: "/", active: true }]} menuItems={[{ label: "Help", href: "/help" }]} /></SidebarProvider></ThemeProvider>);
 * }
 * ```
 */
export function Header({
  className,
  logo,
  title,
  menuPosition = 'right',
  menuItems = [],
  navItems = [],
  user,
  userMenuItems = [],
  onLogout,
  showThemeToggle = true,
  showColorToggle = true,
  showSpaceToggle = true,
  showLanguageToggle = true,
  onLanguageChange,
  currentLanguage,
  actions,
  ...props
}: HeaderProps) {
  // If logo is on the left (default/implied), menu icon should be on the right by default?
  // Requirement 4: "menu icon in left or right end(choosable. in right if logo is in left)"
  // If logo is provided, it usually sits on the left. So menuPosition default 'right' makes sense.
  // If menuPosition is 'left', we should probably ensure logo isn't conflicting or logo is hidden?
  // Let's assume user handles logic or we prioritize menuPosition.
  // However, "in right if logo is in left" implies conditional default.
  // We already defaulted menuPosition to 'right' in props.

  // Determine effective menu position.
  // If logo is present and menuPosition is undefined, it defaults to right.

  const isMenuLeft = menuPosition === 'left';

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-primary text-primary-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      <div className='flex h-16 items-center justify-between px-4 gap-4 overflow-hidden'>
        <div className='flex items-center gap-4 min-w-0 flex-shrink-0 relative z-10 bg-primary pr-4'>
          {/* Left Section */}
          {isMenuLeft && menuItems.length > 0 && (
            <div className='flex-shrink-0'>
              <MobileMenu
                menuItems={menuItems}
                isMenuLeft={isMenuLeft}
                showThemeToggle={showThemeToggle}
                showColorToggle={showColorToggle}
                showSpaceToggle={showSpaceToggle}
                showLanguageToggle={showLanguageToggle}
              />
            </div>
          )}

          {logo && (
            <div className='flex items-center gap-2 min-w-0'>
              {logo}
              {title && (
                <span className='text-lg font-bold hidden md:inline-block truncate'>{title}</span>
              )}
            </div>
          )}
          {/* Title without logo if applicable */}
          {!logo && title && (
            <div className='flex items-center gap-2 min-w-0'>
              <span className='text-lg font-bold truncate'>{title}</span>
            </div>
          )}

          {/* Center/Nav Section - hidden on mobile */}
          <nav className='flex items-center gap-6 text-sm font-medium hidden md:flex'>
            {navItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                onClick={item.onClick}
                className={cn(
                  'transition-colors hover:text-primary-foreground/80',
                  item.active
                    ? 'text-primary-foreground font-bold underline underline-offset-4'
                    : 'text-primary-foreground/60',
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Right Section - flex-row-reverse ensures essential items stay at right edge */}
        <div className='ml-auto flex items-center justify-end gap-2 min-w-0 flex-shrink'>
          {/* Switchers - shrink before title */}
          <div className='flex items-center gap-2 min-w-0 flex-shrink overflow-hidden justify-end'>
            {showSpaceToggle && <SpacingThemeSwitcher variant='toggle' withBackground />}
            {showColorToggle && <ColorThemeSwitcher variant='toggle' withBackground />}
            {showThemeToggle && <ThemeModeSwitcher variant='toggle' withBackground />}
            {showLanguageToggle && (
              <LanguageSwitcher
                onLanguageChange={onLanguageChange}
                currentLanguage={currentLanguage}
              />
            )}
          </div>

          {/* Essential actions - always visible */}
          <div className='flex items-center gap-2 flex-none relative z-20 bg-primary pl-2'>
            {/* User Profile */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`${user.initials || user.name.slice(0, 2).toUpperCase()} ${user.name} ユーザーメニュー`}
                  className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    'relative h-8 w-8 rounded-full p-0 flex items-center justify-center',
                  )}
                >
                  <Avatar className='h-8 w-8'>
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback>
                      {user.initials || user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-56' align='end'>
                  <DropdownMenuGroup>
                  <DropdownMenuLabel className='font-normal'>
                    <div className='flex flex-col space-y-1'>
                      <p className='text-sm font-medium leading-none'>{user.name}</p>
                      <p className='text-xs leading-none text-muted-foreground'>{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userMenuItems.map((item, index) => (
                    <DropdownMenuItem key={index} onClick={item.onClick}>
                      {item.href ? (
                        <a href={item.href} className='w-full h-full flex items-center'>
                          {item.label}
                        </a>
                      ) : (
                        item.label
                      )}
                    </DropdownMenuItem>
                  ))}
                  {onLogout && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onLogout}>Log out</DropdownMenuItem>
                    </>
                  )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {actions}

            {/* Mobile Menu Trigger (Right side) */}
            {!isMenuLeft && menuItems.length > 0 && (
              <MobileMenu
                menuItems={menuItems}
                isMenuLeft={isMenuLeft}
                showThemeToggle={showThemeToggle}
                showColorToggle={showColorToggle}
                showSpaceToggle={showSpaceToggle}
                showLanguageToggle={showLanguageToggle}
              />
            )}

            {/* Mobile Sidebar Trigger (rightmost when no menu icon) */}
            <SidebarTrigger className='md:hidden' />
          </div>
        </div>
      </div>
    </header>
  );
}
