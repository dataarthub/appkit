/**
 * テーマモジュール
 *
 * ダークモード、カラーテーマ、スペーシングテーマを管理。
 */
export { ThemeProvider } from './theme-provider';
export { useTheme } from './theme-context';
export { ThemeScript } from './theme-script';
export type { ThemeProviderProps } from './theme-provider';
export type { CustomThemeColors } from './theme-context';
export {
  ThemeModeSwitcher,
  ColorThemeSwitcher,
  SpacingThemeSwitcher,
  ThemeSwitcherGroup,
} from './theme-switcher';
export type { ThemeSwitcherProps, ThemeSwitcherGroupProps } from './theme-switcher';

export { ThemeProviderContext } from './theme-context';
export type { Theme, ColorTheme, SpacingTheme } from './theme-context';
