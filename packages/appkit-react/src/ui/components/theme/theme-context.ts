import { createContext, useContext } from 'react';

/**
 * Requested document mode: system follows prefers-color-scheme; light/dark are explicit.
 *
 * @see ThemeProvider for setup and usage.
 */
export type Theme = 'dark' | 'light' | 'system';
/**
 * Palette name used as theme-{name} on documentElement; custom names require host CSS.
 *
 * @see ThemeProvider for setup and usage.
 */
export type ColorTheme = 'default' | 'blue' | 'green' | 'rose' | 'orange' | string;
/**
 * Document density class suffix applied by ThemeProvider.
 *
 * @see ThemeProvider for setup and usage.
 */
export type SpacingTheme = 'compact' | 'normal' | 'comfortable';

/**
 * Optional raw CSS values written to documentElement as --{property} variables.
 *
 * @remarks Values are not parsed or validated. Omitted or empty values are not applied;
 * the provider removes supplied variable names on cleanup.
 *
 * @see ThemeProvider for the customColors input and lifecycle.
 */
export interface CustomThemeColors {
  // Color tokens
  /** Optional CSS value for --primary; no value is written when omitted. */
  primary?: string;
  /** Optional CSS value for --primary-foreground; no value is written when omitted. */
  'primary-foreground'?: string;
  /** Optional CSS value for --secondary; no value is written when omitted. */
  secondary?: string;
  /** Optional CSS value for --secondary-foreground; no value is written when omitted. */
  'secondary-foreground'?: string;
  /** Optional CSS value for --accent; no value is written when omitted. */
  accent?: string;
  /** Optional CSS value for --accent-foreground; no value is written when omitted. */
  'accent-foreground'?: string;
  /** Optional CSS value for --muted; no value is written when omitted. */
  muted?: string;
  /** Optional CSS value for --muted-foreground; no value is written when omitted. */
  'muted-foreground'?: string;
  /** Optional CSS value for --destructive; no value is written when omitted. */
  destructive?: string;
  /** Optional CSS value for --destructive-foreground; no value is written when omitted. */
  'destructive-foreground'?: string;
  /** Optional CSS value for --background; no value is written when omitted. */
  background?: string;
  /** Optional CSS value for --foreground; no value is written when omitted. */
  foreground?: string;
  /** Optional CSS value for --card; no value is written when omitted. */
  card?: string;
  /** Optional CSS value for --card-foreground; no value is written when omitted. */
  'card-foreground'?: string;
  /** Optional CSS value for --popover; no value is written when omitted. */
  popover?: string;
  /** Optional CSS value for --popover-foreground; no value is written when omitted. */
  'popover-foreground'?: string;
  /** Optional CSS value for --border; no value is written when omitted. */
  border?: string;
  /** Optional CSS value for --input; no value is written when omitted. */
  input?: string;
  /** Optional CSS value for --ring; no value is written when omitted. */
  ring?: string;

  // Spacing & sizing
  /** Optional CSS value for --spacing-0; no value is written when omitted. */
  'spacing-0'?: string;
  /** Optional CSS value for --spacing-1; no value is written when omitted. */
  'spacing-1'?: string;
  /** Optional CSS value for --spacing-2; no value is written when omitted. */
  'spacing-2'?: string;
  /** Optional CSS value for --spacing-3; no value is written when omitted. */
  'spacing-3'?: string;
  /** Optional CSS value for --spacing-4; no value is written when omitted. */
  'spacing-4'?: string;
  /** Optional CSS value for --spacing-6; no value is written when omitted. */
  'spacing-6'?: string;
  /** Optional CSS value for --spacing-8; no value is written when omitted. */
  'spacing-8'?: string;
  /** Optional CSS value for --spacing-12; no value is written when omitted. */
  'spacing-12'?: string;
  /** Optional CSS value for --spacing-16; no value is written when omitted. */
  'spacing-16'?: string;
  /** Optional CSS value for --spacing-24; no value is written when omitted. */
  'spacing-24'?: string;
  /** Optional CSS value for --spacing-32; no value is written when omitted. */
  'spacing-32'?: string;

  // Border radius
  /** Optional CSS value for --radius; no value is written when omitted. */
  radius?: string;
  /** Optional CSS value for --radius-sm; no value is written when omitted. */
  'radius-sm'?: string;
  /** Optional CSS value for --radius-md; no value is written when omitted. */
  'radius-md'?: string;
  /** Optional CSS value for --radius-lg; no value is written when omitted. */
  'radius-lg'?: string;
  /** Optional CSS value for --radius-xl; no value is written when omitted. */
  'radius-xl'?: string;
  /** Optional CSS value for --radius-2xl; no value is written when omitted. */
  'radius-2xl'?: string;
  /** Optional CSS value for --radius-full; no value is written when omitted. */
  'radius-full'?: string;

  // Shadows
  /** Optional CSS value for --shadow-sm; no value is written when omitted. */
  'shadow-sm'?: string;
  /** Optional CSS value for --shadow-md; no value is written when omitted. */
  'shadow-md'?: string;
  /** Optional CSS value for --shadow-lg; no value is written when omitted. */
  'shadow-lg'?: string;
  /** Optional CSS value for --shadow-xl; no value is written when omitted. */
  'shadow-xl'?: string;
  /** Optional CSS value for --shadow-2xl; no value is written when omitted. */
  'shadow-2xl'?: string;

  // Typography
  /** Optional CSS value for --font-sans; no value is written when omitted. */
  'font-sans'?: string;
  /** Optional CSS value for --font-serif; no value is written when omitted. */
  'font-serif'?: string;
  /** Optional CSS value for --font-mono; no value is written when omitted. */
  'font-mono'?: string;
  /** Optional CSS value for --text-xs; no value is written when omitted. */
  'text-xs'?: string;
  /** Optional CSS value for --text-sm; no value is written when omitted. */
  'text-sm'?: string;
  /** Optional CSS value for --text-base; no value is written when omitted. */
  'text-base'?: string;
  /** Optional CSS value for --text-lg; no value is written when omitted. */
  'text-lg'?: string;
  /** Optional CSS value for --text-xl; no value is written when omitted. */
  'text-xl'?: string;
  /** Optional CSS value for --text-2xl; no value is written when omitted. */
  'text-2xl'?: string;
  /** Optional CSS value for --text-3xl; no value is written when omitted. */
  'text-3xl'?: string;
  /** Optional CSS value for --text-4xl; no value is written when omitted. */
  'text-4xl'?: string;
  /** Optional CSS value for --font-weight-normal; no value is written when omitted. */
  'font-weight-normal'?: string;
  /** Optional CSS value for --font-weight-medium; no value is written when omitted. */
  'font-weight-medium'?: string;
  /** Optional CSS value for --font-weight-semibold; no value is written when omitted. */
  'font-weight-semibold'?: string;
  /** Optional CSS value for --font-weight-bold; no value is written when omitted. */
  'font-weight-bold'?: string;
  /** Optional CSS value for --tracking-tight; no value is written when omitted. */
  'tracking-tight'?: string;
  /** Optional CSS value for --tracking-normal; no value is written when omitted. */
  'tracking-normal'?: string;
  /** Optional CSS value for --tracking-wide; no value is written when omitted. */
  'tracking-wide'?: string;
  /** Optional CSS value for --leading-none; no value is written when omitted. */
  'leading-none'?: string;
  /** Optional CSS value for --leading-tight; no value is written when omitted. */
  'leading-tight'?: string;
  /** Optional CSS value for --leading-normal; no value is written when omitted. */
  'leading-normal'?: string;
  /** Optional CSS value for --leading-relaxed; no value is written when omitted. */
  'leading-relaxed'?: string;

  // Breakpoints
  /** Optional CSS value for --breakpoint-sm; no value is written when omitted. */
  'breakpoint-sm'?: string;
  /** Optional CSS value for --breakpoint-md; no value is written when omitted. */
  'breakpoint-md'?: string;
  /** Optional CSS value for --breakpoint-lg; no value is written when omitted. */
  'breakpoint-lg'?: string;
  /** Optional CSS value for --breakpoint-xl; no value is written when omitted. */
  'breakpoint-xl'?: string;
  /** Optional CSS value for --breakpoint-2xl; no value is written when omitted. */
  'breakpoint-2xl'?: string;
}

/**
 * Theme state and setters exposed by ThemeProvider.
 *
 * @remarks Mode/palette/density setters write localStorage and may throw on access failure;
 * customColors updates are in memory.
 *
 * @see useTheme for consumption.
 */
export type ThemeProviderState = {
  /**
   * Requested mode, initially system outside a provider.
   */
  theme: Theme;
  /**
   * Resolved light/dark mode; initially light, then updated by provider effects.
   */
  resolvedTheme: 'light' | 'dark';
  /**
   * Update mode and persist it under the provider storage key.
   *
   * @param theme - Requested light, dark or system mode.
   *
   * @returns No value after writing storage and scheduling state.
   */
  setTheme: (theme: Theme) => void;
  /**
   * Active palette name, initially default outside a provider.
   */
  colorTheme: ColorTheme;
  /**
   * Update the palette class suffix and persist it.
   *
   * @param colorTheme - Palette name; custom names require corresponding host CSS.
   *
   * @returns No value after writing storage and scheduling state.
   */
  setColorTheme: (colorTheme: ColorTheme) => void;
  /**
   * Active density, initially normal outside a provider.
   */
  spacingTheme: SpacingTheme;
  /**
   * Update document density and persist it.
   *
   * @param spacingTheme - Compact, normal or comfortable density.
   *
   * @returns No value after writing storage and scheduling state.
   */
  setSpacingTheme: (spacingTheme: SpacingTheme) => void;
  /**
   * Current optional custom variable values.
   */
  customColors?: CustomThemeColors;
  /**
   * Replace the in-memory custom CSS variable map.
   *
   * @param colors - CSS values to apply; old map variables are removed by effect cleanup.
   *
   * @returns No value; does not persist colors to localStorage.
   */
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

/**
 * React context carrying document theme state.
 *
 * @remarks Its default value is an inert system/default/normal state with no-op setters.
 * Use ThemeProvider to apply and persist changes.
 *
 * @see useTheme for consumption.
 */
export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * Reads theme state and setters from the nearest ThemeProvider.
 *
 * @returns Current provider state, or inert system/default/normal defaults outside a provider.
 *
 * @throws If a custom context provider explicitly supplies undefined.
 *
 * @remarks ThemeProvider supplies active setters; import @alneas/appkit-react/styles to
 * style Appkit palettes and density. The context has a defined default, so a missing
 * provider does not normally throw. localStorage failures from active setters propagate.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { ThemeProvider, useTheme } from '@alneas/appkit-react/ui/theme';
 * function Toggle() {
 *   const { theme, setTheme } = useTheme();
 *   return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Theme</button>;
 * }
 * export function ThemeExample() { return <ThemeProvider><Toggle /></ThemeProvider>; }
 * ```
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
