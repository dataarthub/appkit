import { useEffect, useRef } from 'react';
import { useTheme, type Theme, type ColorTheme } from '../src/ui/theme';

/** Apply toolbar changes once, allowing subsequent in-story user selections. */
export function SynchronizeThemeGlobals({ mode, palette }: { mode: Theme; palette: ColorTheme }) {
  const theme = useTheme();
  const current = useRef(theme);
  current.current = theme;
  useEffect(() => {
    current.current.setTheme(mode);
    current.current.setColorTheme(palette);
  }, [mode, palette]);
  return null;
}
