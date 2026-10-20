import { Button } from '../ui/button';
import { Globe } from 'lucide-react';
import { getLocale, setLocale, Locale } from '../../paraglide/runtime.js';

/**
 * Host inputs and presentation settings for LanguageSwitcher.
 * @see LanguageSwitcher
 */
export interface LanguageSwitcherProps {
  /**
   * Called with en when the current locale is ja, otherwise ja. When supplied, suppresses the built-in global setLocale call; the host must update controlled state.
   * @param lang - Host callback input described above.
   * @returns No value; complete the host callback action.
   */
  onLanguageChange?: (lang: Locale) => void;

  /**
   * Current locale; omitted reads getLocale from the configured Paraglide runtime.
   */
  currentLanguage?: Locale;

  /**
   * Additional classes on the language toggle button.
   */
  className?: string;
}

/**
 * Displays the current locale and toggles Japanese to English or any other locale to Japanese.
 * @param props - Optional controlled locale, change callback and button classes; see LanguageSwitcherProps.
 * @returns The rendered LanguageSwitcher composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS. currentLanguage overrides getLocale; onLanguageChange suppresses the built-in setLocale call, so the host must update controlled locale state. Without the callback the Paraglide runtime performs its configured locale update/navigation. Locale state during SSR is host-owned and must be isolated per request and initialized consistently before hydration. The label displays Japanese/Chinese/English, but the toggle does not cycle through Chinese.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { LanguageSwitcher } from '@alneas/appkit-react/tools/i18n';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [locale, setLocale] = useState<"en" | "ja" | "zh">("en");
 *   return (<LanguageSwitcher currentLanguage={locale} onLanguageChange={setLocale} />);
 * }
 * ```
 */
export function LanguageSwitcher({
  onLanguageChange,
  currentLanguage,
  className,
}: LanguageSwitcherProps) {
  const activeLang = currentLanguage ?? getLocale();
  const displayLang = activeLang;

  const toggleLanguage = () => {
    const newLang: Locale = activeLang === 'ja' ? 'en' : 'ja';

    if (onLanguageChange) {
      onLanguageChange(newLang);
    } else {
      setLocale(newLang);
    }
  };

  return (
    <Button
      variant='ghost'
      size='sm'
      className={className}
      onClick={toggleLanguage}
      title={displayLang === 'ja' ? 'Switch to English' : '日本語に切り替え'}
    >
      <Globe className='w-4 h-4 mr-2' />
      {displayLang === 'ja' ? '日本語' : displayLang === 'zh' ? '中文' : 'English'}
    </Button>
  );
}
