/**
 * Emits an inline script that applies stored theme classes before client rendering.
 *
 * @returns Script element whose contents read localStorage and prefers-color-scheme.
 *
 * @remarks Uses only the fixed default vite-ui-theme, vite-ui-color-theme and
 * vite-ui-spacing-theme keys, even if ThemeProvider uses custom keys. It adds root
 * classes without first removing existing classes; failures are swallowed. It does not
 * apply custom colors. Place early in server HTML and allow this script under the host
 * CSP; no nonce prop is accepted. Import Appkit styles in the host.
 *
 * @example
 * ```tsx
 * import '@alneas/appkit-react/styles';
 * import { ThemeScript } from '@alneas/appkit-react/ui/theme';
 * export function DocumentHead() { return <head><ThemeScript /></head>; }
 * ```
 */
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var storageKey = "vite-ui-theme";
        var colorKey = "vite-ui-color-theme";
        var spacingKey = "vite-ui-spacing-theme";
        
        var theme = localStorage.getItem(storageKey);
        var colorTheme = localStorage.getItem(colorKey);
        var spacingTheme = localStorage.getItem(spacingKey);
        
        var supportDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches === true;
        
        if (!theme || theme === "system") {
          if (supportDarkMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.add("light");
          }
        } else {
          document.documentElement.classList.add(theme);
        }
        
        if (colorTheme && colorTheme !== "default") {
          document.documentElement.classList.add("theme-" + colorTheme);
        }
        
        if (spacingTheme) {
            document.documentElement.classList.add("spacing-" + spacingTheme);
        } else {
            document.documentElement.classList.add("spacing-normal");
        }
      } catch (e) {}
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: script,
      }}
    />
  );
}
