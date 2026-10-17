'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

export type TransitionType =
  | 'wipe'
  | 'sweep'
  | 'radial'
  | 'glitch'
  | 'zoom'
  | 'curtain';

export interface ScreenTransitionProps {
  children: React.ReactNode;
  type?: TransitionType;
  duration?: number;
  trigger?: string | number;
  onHalf?: () => void;
  className?: string;
}

/**
 * SF的なページ遷移アニメーションを提供するコンポーネント。
 *
 * `trigger` の値が変わると exit → swap → enter の3フェーズ遷移を実行する。
 * ルーター非依存で動作する。TanStack Router と組み合わせる場合は
 * `RouterScreenTransition` を使用する。
 *
 * アニメーションのCSSは `@alneas/appkit-react/tools/transitions` を
 * インポートすることで有効になる。
 *
 * @param children - 遷移コンテンツ
 * @param type - 遷移タイプ（wipe / sweep / radial / glitch / zoom / curtain）
 * @param duration - 遷移時間（ms, デフォルト 400）
 * @param trigger - この値が変わると遷移が発火する
 * @param onHalf - exit 完了 + enter 開始のタイミングで呼ばれる
 * @param className - 追加クラス
 *
 * @example
 * ```tsx
 * // Internal experimental component; not available as a published package entry.
 *
 * <ScreenTransition type="radial" trigger={pathname} onHalf={swapContent}>
 *   <YourPage />
 * </ScreenTransition>
 * ```
 */
export function ScreenTransition({
  children,
  type = 'glitch',
  duration = 400,
  trigger,
  onHalf,
  className,
}: ScreenTransitionProps) {
  const [phase, setPhase] = React.useState<'idle' | 'exiting' | 'entering'>('idle');
  const [currentChildren, setCurrentChildren] = React.useState(children);
  const prevTrigger = React.useRef(trigger);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    if (trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;

    const half = duration / 2;

    setPhase('exiting');
    timerRef.current = setTimeout(() => {
      setCurrentChildren(children);
      onHalf?.();
      setPhase('entering');
      setTimeout(() => setPhase('idle'), half);
    }, half);

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <div
      className={cn(
        'future-transition',
        `future-transition-${type}`,
        phase === 'exiting' && 'future-transition-exit',
        phase === 'entering' && 'future-transition-enter',
        phase === 'idle' && 'future-transition-idle',
        className,
      )}
      style={{
        ['--future-duration' as string]: `${duration}ms`,
      }}
    >
      {currentChildren}
    </div>
  );
}
ScreenTransition.displayName = 'ScreenTransition';
