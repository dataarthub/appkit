import { createContext, useContext } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type ColorTheme = 'default' | 'blue' | 'green' | 'rose' | 'orange' | string;
export type SpacingTheme = 'compact' | 'normal' | 'comfortable';

export interface CustomThemeColors {
  // Color tokens
  primary?: string;
  'primary-foreground'?: string;
  secondary?: string;
  'secondary-foreground'?: string;
  accent?: string;
  'accent-foreground'?: string;
  muted?: string;
  'muted-foreground'?: string;
  destructive?: string;
  'destructive-foreground'?: string;
  background?: string;
  foreground?: string;
  card?: string;
  'card-foreground'?: string;
  popover?: string;
  'popover-foreground'?: string;
  border?: string;
  input?: string;
  ring?: string;

  // Spacing & sizing
  'spacing-0'?: string;
  'spacing-1'?: string;
  'spacing-2'?: string;
  'spacing-3'?: string;
  'spacing-4'?: string;
  'spacing-6'?: string;
  'spacing-8'?: string;
  'spacing-12'?: string;
  'spacing-16'?: string;
  'spacing-24'?: string;
  'spacing-32'?: string;

  // Border radius
  radius?: string;
  'radius-sm'?: string;
  'radius-md'?: string;
  'radius-lg'?: string;
  'radius-xl'?: string;
  'radius-2xl'?: string;
  'radius-full'?: string;

  // Shadows
  'shadow-sm'?: string;
  'shadow-md'?: string;
  'shadow-lg'?: string;
  'shadow-xl'?: string;
  'shadow-2xl'?: string;

  // Typography
  'font-sans'?: string;
  'font-serif'?: string;
  'font-mono'?: string;
  'text-xs'?: string;
  'text-sm'?: string;
  'text-base'?: string;
  'text-lg'?: string;
  'text-xl'?: string;
  'text-2xl'?: string;
  'text-3xl'?: string;
  'text-4xl'?: string;
  'font-weight-normal'?: string;
  'font-weight-medium'?: string;
  'font-weight-semibold'?: string;
  'font-weight-bold'?: string;
  'tracking-tight'?: string;
  'tracking-normal'?: string;
  'tracking-wide'?: string;
  'leading-none'?: string;
  'leading-tight'?: string;
  'leading-normal'?: string;
  'leading-relaxed'?: string;

  // Breakpoints
  'breakpoint-sm'?: string;
  'breakpoint-md'?: string;
  'breakpoint-lg'?: string;
  'breakpoint-xl'?: string;
  'breakpoint-2xl'?: string;
}

export type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
  spacingTheme: SpacingTheme;
  setSpacingTheme: (spacingTheme: SpacingTheme) => void;
  customColors?: CustomThemeColors;
  setCustomColors: (colors: CustomThemeColors) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => null,
  colorTheme: 'default',
  setColorTheme: () => null,
  spacingTheme: 'normal',
  setSpacingTheme: () => null,
  setCustomColors: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * テーマコンテキストを取得するフック
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
