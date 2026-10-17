import { useEffect, useState } from 'react';
import {
  type Theme,
  type ColorTheme,
  type SpacingTheme,
  type CustomThemeColors,
  ThemeProviderContext,
} from './theme-context';

export type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultColorTheme?: ColorTheme;
  defaultSpacingTheme?: SpacingTheme;
  customColors?: CustomThemeColors;
  storageKey?: string;
  colorThemeStorageKey?: string;
  spacingThemeStorageKey?: string;
};

/**
 * テーマプロバイダーコンポーネント
 *
 * ダークモード、カラーテーマ、スペーシングテーマを管理。
 * アプリケーションのルートで使用。
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from "../..";
 *
 * <ThemeProvider defaultTheme="system" defaultColorTheme="blue">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultColorTheme = 'default',
  defaultSpacingTheme = 'normal',
  customColors: initialCustomColors,
  storageKey = 'vite-ui-theme',
  colorThemeStorageKey = 'vite-ui-color-theme',
  spacingThemeStorageKey = 'vite-ui-spacing-theme',
  ...props
}: ThemeProviderProps) {
  // Initialize with defaults to avoid SSR ReferenceError and Hydration Mismatch
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
  });
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    if (typeof window === 'undefined') return defaultColorTheme;
    return (localStorage.getItem(colorThemeStorageKey) as ColorTheme) || defaultColorTheme;
  });
  const [spacingTheme, setSpacingTheme] = useState<SpacingTheme>(() => {
    if (typeof window === 'undefined') return defaultSpacingTheme;
    return (localStorage.getItem(spacingThemeStorageKey) as SpacingTheme) || defaultSpacingTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const [customColors, setCustomColors] = useState<CustomThemeColors | undefined>(
    initialCustomColors,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (t: Theme) => {
      root.classList.remove('light', 'dark');

      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

        root.classList.add(systemTheme);
        setResolvedTheme(systemTheme);
        return;
      }

      root.classList.add(t);
      setResolvedTheme(t as 'light' | 'dark');
    };

    applyTheme(theme);

    // Listen for system changes if set to system
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;

    // 既存のカラーテーマクラスを削除
    root.classList.remove('theme-blue', 'theme-green', 'theme-rose', 'theme-orange', 'theme-future');

    // デフォルト以外の場合はクラスを追加
    if (colorTheme !== 'default') {
      root.classList.add(`theme-${colorTheme}`);
    }
  }, [colorTheme]);

  // スペーシングテーマを適用
  useEffect(() => {
    const root = window.document.documentElement;

    // 既存のスペーシングクラスを削除
    root.classList.remove('spacing-compact', 'spacing-normal', 'spacing-comfortable');

    // スペーシングテーマクラスを追加
    root.classList.add(`spacing-${spacingTheme}`);
  }, [spacingTheme]);

  // カスタムカラーをCSS変数として適用
  useEffect(() => {
    const root = window.document.documentElement;

    if (customColors) {
      // CSS変数を設定
      Object.entries(customColors).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(`--${key}`, value);
        }
      });
    }

    // クリーンアップ: カスタムカラーが削除された場合は元に戻す
    return () => {
      if (customColors) {
        Object.keys(customColors).forEach((key) => {
          root.style.removeProperty(`--${key}`);
        });
      }
    };
  }, [customColors]);

  const value = {
    theme,
    resolvedTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    colorTheme,
    setColorTheme: (colorTheme: ColorTheme) => {
      localStorage.setItem(colorThemeStorageKey, colorTheme);
      setColorTheme(colorTheme);
    },
    spacingTheme,
    setSpacingTheme: (spacingTheme: SpacingTheme) => {
      localStorage.setItem(spacingThemeStorageKey, spacingTheme);
      setSpacingTheme(spacingTheme);
    },
    customColors,
    setCustomColors,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

/**
 * テーマコンテキストを取得するフック
 *
 * テーマモード、カラーテーマ、スペーシングテーマの
 * 取得と変更が可能。
 *
 * @returns テーマ状態と設定関数
 *
 * @example
 * ```tsx
 * const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
 * ```
 */
