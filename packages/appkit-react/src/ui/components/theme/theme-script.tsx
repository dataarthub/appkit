/**
 * 初期レンダリング時の画面のちらつき（FOUC）を防ぐため、HTMLの読み込み直後にローカルストレージやシステム設定からテーマ（ダーク/ライト、カラー、スペース等）を読み込み、適用するためのインラインスクリプトコンポーネント。
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
