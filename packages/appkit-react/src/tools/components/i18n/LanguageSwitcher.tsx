import { Button } from '../ui/button';
import { Globe } from 'lucide-react';
import { getLocale, setLocale, Locale } from '../../paraglide/runtime.js';

/**
 * Props for LanguageSwitcher
 */
export interface LanguageSwitcherProps {
  /**
   * Optional callback when language changes.
   * If provided, the internal state update is skipped (controlled mode).
   * If not provided, it updates the global paraglide state.
   */
  onLanguageChange?: (lang: Locale) => void;

  /**
   * Current language (for controlled mode).
   * Defaults to global paraglide state if not provided.
   */
  currentLanguage?: Locale;

  /**
   * Optional className for the button.
   */
  className?: string;
}

/**
 * 言語切り替えボタン
 *
 * Paraglide.js と連携して動作します。現在のen/ja/zhをそれぞれEnglish/日本語/中文で表示します。
 * 切替先は従来どおりjaからen、それ以外からjaです。
 * SSR also reads currentLanguage or the host runtime. Hosts must isolate request
 * locale state and initialize the same locale before hydration.
 * @example
 * ```tsx
 * import { LanguageSwitcher } from '@alneas/appkit-react/tools/i18n';
 * <LanguageSwitcher currentLanguage="zh" onLanguageChange={locale => console.log(locale)} />;
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
