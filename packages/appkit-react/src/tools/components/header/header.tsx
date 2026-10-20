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
 * ヘッダーのプロップス
 */
export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** ロゴ要素 */
  logo?: React.ReactNode;
  /** タイトル */
  title?: string;
  /** メニュー位置 */
  menuPosition?: 'left' | 'right';
  /** メニューアイテム */
  menuItems?: { label: string; onClick?: () => void; href?: string; icon?: React.ReactNode }[];
  /** ナビゲーションアイテム */
  navItems?: { label: string; onClick?: () => void; href?: string; active?: boolean }[];
  /** ユーザー情報 */
  user?: {
    name: string;
    email?: string;
    image?: string;
    initials?: string;
  };
  /** ユーザーメニューアイテム */
  userMenuItems?: { label: string; onClick?: () => void; href?: string; icon?: React.ReactNode }[];
  /** ログアウトコールバック */
  onLogout?: () => void;
  /** ダーク/ライトモード切替ボタン表示 */
  showThemeToggle?: boolean;
  /** カラーテーマ切替ボタン表示 */
  showColorToggle?: boolean;
  /** スペーシング切替ボタン表示 */
  showSpaceToggle?: boolean;
  /** 言語切替ボタン表示 */
  showLanguageToggle?: boolean;
  /** 言語変更時のコールバック */
  onLanguageChange?: (lang: Locale) => void;
  /** 現在の言語 */
  currentLanguage?: Locale;
  /** 追加アクション */
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
 * ヘッダーコンポーネント
 *
 * ロゴ、ナビゲーション、テーマ切り替え、ユーザーメニューを含む
 * レスポンシブなヘッダーコンポーネント。
 *
 * @example
 * ```tsx
 * import { Header } from '@alneas/appkit-react/tools/header';
 *
 * <Header
 *   logo={<img src="/logo.svg" alt="Logo" />}
 *   title="My App"
 *   navItems={[
 *     { label: 'ホーム', href: '/', active: true },
 *     { label: '設定', href: '/settings' },
 *   ]}
 *   user={{ name: '山田太郎', email: 'yamada@example.com' }}
 *   onLogout={() => handleLogout()}
 * />
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
