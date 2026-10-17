'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { ScreenTransition, type TransitionType } from '../future/ScreenTransition';

const PHASE_MESSAGES: Record<string, string> = {
  initializing: 'システムを初期化しています...',
  loading: 'データを読み込んでいます...',
  hydrating: 'アプリケーションを起動しています...',
  connecting: 'サーバーに接続しています...',
  syncing: 'データを同期しています...',
  ready: '',
};

export interface SplashScreenProps {
  /** スプラッシュを表示するか（false で退場アニメ開始） */
  show: boolean;
  /** 退場アニメーションのタイプ */
  type?: TransitionType;
  /** アニメーション時間（ms, デフォルト 600） */
  duration?: number;
  /** 表示フェーズ（initializing / loading / hydrating / connecting / syncing） */
  phase?: string;
  /** 任意のメッセージ（phase より優先） */
  message?: string;
  /** 任意のロゴ要素 */
  logo?: React.ReactNode;
  /** 完全カスタムコンテンツ（渡すと phase/message/logo は無視） */
  children?: React.ReactNode;
  /** アニメーション完了時のコールバック */
  onComplete?: () => void;
  /** 追加クラス */
  className?: string;
}

/**
 * 全画面スプラッシュ画面コンポーネント。
 *
 * アプリ起動時の初期化・データ読み込み中などに表示する。
 * `show` が `false` になると `ScreenTransition` の退場アニメーションを再生し、
 * 完了後に DOM から削除される。
 *
 * 子要素を渡せば完全カスタム表示、渡さなければ `phase` に応じた
 * デフォルトメッセージ + ロゴを表示する。
 *
 * ### 表示タイミングの制御
 *
 * スプラッシュの表示制御はプロジェクト側で行う。典型的なパターン:
 *
 * ```tsx
 * function App() {
 *   const [ready, setReady] = useState(false);
 *
 *   useEffect(() => {
 *     Promise.all([
 *       initAuth(),
 *       loadData(),
 *       hydrateApp(),
 *     ]).then(() => setReady(true));
 *   }, []);
 *
 *   return (
 *     <>
 *       <SplashScreen
 *         show={!ready}
 *         type="radial"
 *         phase={phase}
 *         onComplete={() => console.log('splash finished')}
 *       />
 *       {ready && <MainApp />}
 *     </>
 *   );
 * }
 * ```
 *
 * @param props - コンポーネントのプロパティ
 * @param props.show - false になると退場アニメーションを開始する
 * @param props.type - 退場アニメーションの種類（デフォルト: glitch）
 * @param props.duration - アニメーション時間（デフォルト: 600ms）
 * @param props.phase - 表示するフェーズ名。内蔵メッセージ: initializing / loading / hydrating / connecting / syncing
 * @param props.message - 任意のメッセージ文字列（phase より優先）
 * @param props.logo - ロゴ要素
 * @param props.children - 完全カスタムコンテンツ
 * @param props.onComplete - 退場アニメーション完了時のコールバック
 * @param props.className - 追加クラス
 *
 * @example
 * ```tsx
 * // デフォルト表示（phase で自動メッセージ）
 * <SplashScreen show={splash} type="radial" phase="hydrating" />
 *
 * // カスタムメッセージ
 * <SplashScreen show={splash} message="データ準備中..." />
 *
 * // 完全カスタム
 * <SplashScreen show={splash} type="glitch">
 *   <MyCustomContent />
 * </SplashScreen>
 * ```
 */
export function SplashScreen({
  show,
  type = 'glitch',
  duration = 600,
  phase,
  message,
  logo,
  children,
  onComplete,
  className,
}: SplashScreenProps) {
  const [exited, setExited] = React.useState(false);

  const handleHalf = React.useCallback(() => {
    setExited(true);
    onComplete?.();
  }, [onComplete]);

  if (exited) return null;

  const defaultContent = (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      {logo && <div className="mb-6">{logo}</div>}
      {!logo && (
        <div className="mb-6 text-2xl font-bold tracking-[0.3em] text-foreground">
          LOADING
        </div>
      )}
      <div
        className={cn(
          'font-mono text-xs tracking-[0.2em]',
          'text-foreground',
        )}
      >
        {message || (phase ? PHASE_MESSAGES[phase] ?? phase : 'LOADING')}
      </div>
      {(!message && !children) && (
        <div className="mt-8 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              style={{
                animation: 'splash-dot 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
                opacity: 0.3,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn('fixed inset-0 z-[10000]', className)}
      style={{ background: 'var(--background)' }}
    >
      <ScreenTransition
        type={type}
        duration={duration}
        trigger={show ? 0 : 1}
        onHalf={handleHalf}
      >
        {children || defaultContent}
      </ScreenTransition>
    </div>
  );
}
SplashScreen.displayName = 'SplashScreen';
