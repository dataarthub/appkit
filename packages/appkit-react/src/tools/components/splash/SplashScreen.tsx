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

/**
 * Host inputs and presentation settings for SplashScreen.
 * @see SplashScreen
 */
export interface SplashScreenProps {
  /**
   * Mount as true, then set false to trigger one dismissal. Initial false does not dismiss automatically.
   */
  show: boolean;
  /**
   * Transition class-name suffix; defaults to glitch. Matching animation CSS is host-owned.
   */
  type?: TransitionType;
  /**
   * Configured full transition duration in milliseconds; defaults to 600. Splash removal/onComplete occur at duration / 2.
   */
  duration?: number;
  /**
   * Built-in phase message key (initializing/loading/hydrating/connecting/syncing/ready); unknown strings display verbatim, omitted displays LOADING.
   */
  phase?: string;
  /**
   * Truthy custom text overriding the phase message; an empty string falls back to the phase.
   */
  message?: string;
  /**
   * Optional logo; omitted renders LOADING text.
   */
  logo?: React.ReactNode;
  /**
   * Truthy custom content replacing phase/message/logo output.
   */
  children?: React.ReactNode;
  /**
   * Called once when the exit midpoint removes the splash, not after the full duration. Later show=true does not remount it.
   * @returns No value; complete the host callback action.
   */
  onComplete?: () => void;
  /**
   * Additional classes on the component outer element.
   */
  className?: string;
}

/**
 * Shows a full-screen loading surface until a true-to-false show change reaches the transition midpoint.
 * @param props - Visibility trigger, transition settings and optional loading content/callback; see SplashScreenProps. Wrapper defaults: type='glitch', duration=600.
 * @returns The rendered SplashScreen composition.
 * @remarks Import @alneas/appkit-react/styles in the rendering host. Import Appkit CSS. The host owns readiness and must mount with show=true, then change to false to start dismissal. Initial show=false does not dismiss because the internal transition records that initial trigger. At duration/2 the splash unmounts itself and calls onComplete; it does not wait for a full exit/enter cycle or reappear after show becomes true. Supplied truthy children replace default content. Transition class names and --future-duration are emitted, but this package has no public tools/transitions stylesheet/export and its bundled CSS supplies no future-transition/splash-dot animation rules; the host must add matching CSS to see those effects.
 * @example
 * ```tsx
 * import { useState } from 'react';
 * import { SplashScreen } from '@alneas/appkit-react/tools/splash';
 * import '@alneas/appkit-react/styles';
 *
 * export function Example() {
 *   const [show, setShow] = useState(true);
 *   return (<><button type="button" onClick={() => setShow(false)}>Ready</button><SplashScreen show={show} phase="loading" /></>);
 * }
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
