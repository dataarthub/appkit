import { Moon, Sun, Monitor, Check, Rows2, Rows3, Rows4, Palette } from 'lucide-react';
import { useTheme } from './theme-context';
import { Button } from '../ui/button';
import { cn } from "../../lib/utils";
import { useIsClient } from "../../lib/hooks/use-is-client";

/**
 * Display settings shared by the theme switchers; see ThemeModeSwitcher for setup.
 *
 * @see ThemeModeSwitcher for the canonical usage example.
 */
export interface ThemeSwitcherProps {
  /** Additional classes on the rendered control. */
  className?: string;
  /** Presentation style; defaults to 'select'. Both 'toggle' and 'cycle' cycle values. */
  variant?: 'select' | 'toggle' | 'icon-group' | 'cycle';
  /**
   * Add a background to icon controls; defaults to false.
   * Select controls ignore this setting.
   */
  withBackground?: boolean;
}

/**
 * Switches between light, dark and system modes from theme context.
 *
 * @param props - Control classes, presentation variant and optional icon background.
 *
 * @returns A select, cycling button or group of mode buttons.
 *
 * @remarks Use inside ThemeProvider and import @alneas/appkit-react/styles. Defaults to
 * select with no background; toggle/cycle advances light, dark, system. Before mount,
 * controls use stable system/light placeholders, then reflect the provider state.
 * The provider's storage setter may throw when browser storage is unavailable.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { ThemeProvider, ThemeModeSwitcher } from '@alneas/appkit-react/ui/theme';
 * export function ThemeControl() {
 *   return <ThemeProvider><ThemeModeSwitcher variant="toggle" /></ThemeProvider>;
 * }
 * ```
 */
export function ThemeModeSwitcher({
  className,
  variant = 'select',
  withBackground = false,
}: ThemeSwitcherProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isClient = useIsClient();

  const modes: Array<{
    value: 'light' | 'dark' | 'system';
    label: string;
    icon: typeof Sun;
  }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const handleCycle = () => {
    const currentIndex = modes.findIndex((m) => m.value === theme);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTheme(modes[nextIndex].value);
  };

  // Icon color: use explicit foreground when withBackground, otherwise inherit from parent
  const iconColorClass = withBackground ? 'text-foreground' : '';

  if (variant === 'toggle' || variant === 'cycle') {
    // SSR-safe: Use a consistent default for initial render
    // After mount, use actual resolvedTheme
    const isDark = isClient ? resolvedTheme === 'dark' : false;

    return (
      <Button
        variant='ghost'
        size='icon'
        className={cn(className, withBackground && 'bg-background/80 hover:bg-background')}
        onClick={handleCycle}
        title={isClient ? `Current theme: ${theme} (${resolvedTheme})` : 'Toggle theme'}
      >
        <div className='relative h-5 w-5 flex items-center justify-center'>
          <Sun
            className={cn(
              'h-5 w-5 transition-all',
              iconColorClass,
              isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
            )}
          />
          <Moon
            className={cn(
              'absolute h-5 w-5 transition-all',
              iconColorClass,
              isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
            )}
          />
        </div>
        <span className='sr-only'>Toggle theme</span>
      </Button>
    );
  }

  if (variant === 'icon-group') {
    // SSR-safe: Use defaultTheme for initial render, actual theme after mount
    const activeTheme = isClient ? theme : 'system';
    return (
      <div
        className={cn(
          'flex items-center gap-1 border rounded-md p-1',
          withBackground ? 'bg-background' : 'bg-transparent border-0',
          className,
        )}
      >
        {modes.map((m) => (
          <Button
            key={m.value}
            variant={activeTheme === m.value ? 'secondary' : 'ghost'}
            size='icon'
            className='h-7 w-7'
            onClick={() => setTheme(m.value)}
            title={m.label}
          >
            <m.icon className='h-4 w-4' />
            <span className='sr-only'>{m.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  // SSR-safe: Use defaultTheme for initial render
  const selectValue = isClient ? theme : 'system';
  return (
    <select
      aria-label='Mode'
      className={cn(
        'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
      value={selectValue}
      onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
    >
      <option value='light'>Light</option>
      <option value='dark'>Dark</option>
      <option value='system'>System</option>
    </select>
  );
}

/**
 * Switches the provider palette among default, blue, green, rose, orange and future.
 *
 * @param props - Control classes, variant (default select) and icon background (default false).
 *
 * @returns A palette select, cycling button or group of color buttons.
 *
 * @remarks Requires ThemeProvider and @alneas/appkit-react/styles. Toggle/cycle advances
 * through the available values. Custom palette names are not listed. An unknown current
 * palette displays Default in toggle/cycle, highlights no icon-group swatch and remains
 * an unmatched select value.
 * Provider localStorage setter errors propagate from interactions.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { ThemeProvider, ColorThemeSwitcher } from '@alneas/appkit-react/ui/theme';
 * export function Control() { return <ThemeProvider><ColorThemeSwitcher /></ThemeProvider>; }
 * ```
 */
export function ColorThemeSwitcher({
  className,
  variant = 'select',
  withBackground = false,
}: ThemeSwitcherProps) {
  const { colorTheme, setColorTheme } = useTheme();
  const isClient = useIsClient();

  const colors = [
    { value: 'default', label: 'Default', color: 'bg-zinc-600' },
    { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
    { value: 'green', label: 'Green', color: 'bg-green-500' },
    { value: 'rose', label: 'Rose', color: 'bg-rose-500' },
    { value: 'orange', label: 'Orange', color: 'bg-orange-500' },
    { value: 'future', label: 'Future', color: 'bg-cyan-500' },
  ];

  // SSR-safe: Use default for initial render
  const activeColorTheme = isClient ? colorTheme : 'default';

  const handleCycle = () => {
    const currentIndex = colors.findIndex((c) => c.value === colorTheme);
    const nextIndex = (currentIndex + 1) % colors.length;
    setColorTheme(colors[nextIndex].value);
  };

  const currentColor = colors.find((c) => c.value === activeColorTheme) || colors[0];

  if (variant === 'toggle' || variant === 'cycle') {
    // withBackground: colored background, white inset ring, white icon
    // no background: just colored palette icon
    if (withBackground) {
      return (
        <Button
          variant='ghost'
          size='icon'
          className={cn(
            'ring-2 ring-inset ring-white/80 hover:ring-white',
            currentColor.color,
            'hover:opacity-90',
            className,
          )}
          onClick={handleCycle}
          title={`Color: ${currentColor.label} (Click to cycle)`}
          aria-label={`Current color: ${currentColor.label}. Click to cycle.`}
        >
          <Palette className='h-5 w-5 text-white' />
          <span className='sr-only'>{currentColor.label}</span>
        </Button>
      );
    }

    // No background: just colored icon
    return (
      <Button
        variant='ghost'
        size='icon'
        className={className}
        onClick={handleCycle}
        title={`Color: ${currentColor.label} (Click to cycle)`}
        aria-label={`Current color: ${currentColor.label}. Click to cycle.`}
      >
        <Palette className={cn('h-5 w-5', currentColor.color.replace('bg-', 'text-'))} />
        <span className='sr-only'>{currentColor.label}</span>
      </Button>
    );
  }

  if (variant === 'icon-group') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 flex-wrap',
          withBackground ? 'bg-background p-1 rounded-md border' : '',
          className,
        )}
      >
        {colors.map((c) => (
          <button
            key={c.value}
            className={cn(
              'h-6 w-6 rounded-full border border-input ring-offset-background hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
              c.color,
              activeColorTheme === c.value && 'ring-2 ring-ring ring-offset-2',
            )}
            onClick={() => setColorTheme(c.value)}
            title={c.label}
            aria-label={c.label}
          >
            {activeColorTheme === c.value && (
              <Check className='h-3 w-3 text-white mx-auto' strokeWidth={3} />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      aria-label='Color'
      className={className}
      value={activeColorTheme}
      onChange={(e) => setColorTheme(e.target.value)}
    >
      {colors.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Switches provider density among compact, normal and comfortable.
 *
 * @param props - Control classes, variant (default select) and icon background (default false).
 *
 * @returns A density select, cycling button or group of density buttons.
 *
 * @remarks Requires ThemeProvider and @alneas/appkit-react/styles. Toggle/cycle advances
 * through the available values. Before mount the displayed density is normal.
 * Provider localStorage setter errors propagate from interactions.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { ThemeProvider, SpacingThemeSwitcher } from '@alneas/appkit-react/ui/theme';
 * export function Control() { return <ThemeProvider><SpacingThemeSwitcher /></ThemeProvider>; }
 * ```
 */
export function SpacingThemeSwitcher({
  className,
  variant = 'select',
  withBackground = false,
}: ThemeSwitcherProps) {
  const { spacingTheme, setSpacingTheme } = useTheme();
  const isClient = useIsClient();

  // SSR-safe: Use default for initial render
  const activeSpacingTheme = isClient ? spacingTheme : 'normal';

  const spacings: Array<{
    value: 'compact' | 'normal' | 'comfortable';
    label: string;
    icon: typeof Rows2;
  }> = [
    { value: 'compact', label: 'Compact', icon: Rows4 }, // More rows = tighter spacing
    { value: 'normal', label: 'Normal', icon: Rows3 }, // Medium
    { value: 'comfortable', label: 'Comfortable', icon: Rows2 }, // Fewer rows = more spacing
  ];

  const handleCycle = () => {
    const currentIndex = spacings.findIndex((s) => s.value === spacingTheme);
    const nextIndex = (currentIndex + 1) % spacings.length;
    setSpacingTheme(spacings[nextIndex].value);
  };

  // Icon color: use explicit foreground when withBackground, otherwise inherit from parent
  const iconColorClass = withBackground ? 'text-foreground' : '';

  if (variant === 'toggle' || variant === 'cycle') {
    const currentSpacing = spacings.find((s) => s.value === activeSpacingTheme) || spacings[1];
    const IconComponent = currentSpacing.icon;

    return (
      <Button
        variant='ghost'
        size='icon'
        className={cn(className, withBackground && 'bg-background/80 hover:bg-background')}
        onClick={handleCycle}
        title={`Spacing: ${currentSpacing.label} (Click to cycle)`}
        aria-label={`Current spacing: ${currentSpacing.label}. Click to cycle.`}
      >
        <IconComponent className={cn('h-5 w-5', iconColorClass)} />
        <span className='sr-only'>{currentSpacing.label}</span>
      </Button>
    );
  }

  if (variant === 'icon-group') {
    return (
      <div
        className={cn(
          'flex items-center gap-1 border rounded-md p-1',
          withBackground ? 'bg-background' : 'bg-transparent border-0',
          className,
        )}
      >
        {spacings.map((s) => (
          <Button
            key={s.value}
            variant={activeSpacingTheme === s.value ? 'secondary' : 'ghost'}
            size='icon'
            className='h-7 w-7'
            onClick={() => setSpacingTheme(s.value)}
            title={s.label}
          >
            <s.icon className='h-4 w-4' />
            <span className='sr-only'>{s.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <select
      aria-label='Density'
      className={className}
      value={activeSpacingTheme}
      onChange={(e) => setSpacingTheme(e.target.value as 'compact' | 'normal' | 'comfortable')}
    >
      <option value='compact'>Compact</option>
      <option value='normal'>Normal</option>
      <option value='comfortable'>Comfortable</option>
    </select>
  );
}

/**
 * Visibility and presentation for ThemeSwitcherGroup; see its usage example.
 * @see ThemeSwitcherGroup for the canonical usage example.
 */
export interface ThemeSwitcherGroupProps {
  /** Classes on the outer group. */
  className?: string;
  /** Classes passed to select controls; defaults to the styled input classes. */
  selectClassName?: string;
  /** Show the mode control; defaults to true. */
  showThemeMode?: boolean;
  /** Show the palette control; defaults to true. */
  showColorTheme?: boolean;
  /** Show the density control; defaults to true. */
  showSpacingTheme?: boolean;
  /** Mode presentation; defaults to select. */
  modeVariant?: 'select' | 'toggle' | 'icon-group';
  /** Palette presentation; defaults to select. */
  colorVariant?: 'select' | 'toggle' | 'icon-group';
  /** Density presentation; defaults to select. */
  spacingVariant?: 'select' | 'toggle' | 'icon-group';
}

/**
 * Groups optional mode, palette and density controls with visible labels.
 *
 * @param props - Group/select classes, visibility flags and per-control variants.
 *
 * @returns A vertical group; all three controls are visible as selects by default.
 *
 * @remarks Requires ThemeProvider and @alneas/appkit-react/styles. Each control persists
 * through the provider; browser storage errors can propagate from interactions.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { ThemeProvider, ThemeSwitcherGroup } from '@alneas/appkit-react/ui/theme';
 * export function ThemeSettings() { return <ThemeProvider><ThemeSwitcherGroup /></ThemeProvider>; }
 * ```
 */
export function ThemeSwitcherGroup({
  className,
  selectClassName = 'h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  showThemeMode = true,
  showColorTheme = true,
  showSpacingTheme = true,
  modeVariant = 'select',
  colorVariant = 'select',
  spacingVariant = 'select',
}: ThemeSwitcherGroupProps) {
  return (
    <div className={cn(className, 'flex flex-col gap-3')}>
      {showThemeMode && (
        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs text-muted-foreground'>Mode</span>
          <ThemeModeSwitcher
            className={modeVariant === 'select' ? selectClassName : undefined}
            variant={modeVariant}
          />
        </div>
      )}
      {showColorTheme && (
        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs text-muted-foreground'>Color</span>
          <ColorThemeSwitcher
            className={colorVariant === 'select' ? selectClassName : undefined}
            variant={colorVariant}
          />
        </div>
      )}
      {showSpacingTheme && (
        <div className='flex items-center justify-between gap-2'>
          <span className='text-xs text-muted-foreground'>Density</span>
          <SpacingThemeSwitcher
            className={spacingVariant === 'select' ? selectClassName : undefined}
            variant={spacingVariant}
          />
        </div>
      )}
    </div>
  );
}
