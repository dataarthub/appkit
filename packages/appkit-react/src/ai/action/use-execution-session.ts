import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createExecutionSession, type ExecutionRecord, type ExecutionSession } from "@alneas/appkit-core/ai";

/**
 * Creates one local execution session and subscribes to its bounded history.
 *
 * @returns Stable session controls and the current read-only history snapshot.
 *
 * @remarks Requires React; no context/styles. Cleanup requests cancellation but cannot
 * undo backend work or force an uncooperative task to stop. The session controls own
 * execution, cancellation, progress and history; no work starts automatically.
 *
 * @example
 * ```tsx
 * import { useExecutionSession } from '@alneas/appkit-react/ai/action';
 * export function HistoryCount() { const { history } = useExecutionSession(); return <output>{history.length}</output>; }
 * ```
 */
export function useExecutionSession(): {
  /** Stable execution-session controls created for this mounted hook. */
  session: ExecutionSession;
  /** Current bounded execution snapshot, updated through subscription. */
  history: readonly ExecutionRecord[];
} {
  const [session] = useState(() => createExecutionSession());
  useLayoutEffect(() => () => { session.cancel(); }, [session]);
  const history = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { session, history };
}
