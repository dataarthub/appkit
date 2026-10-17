import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createExecutionSession, type ExecutionRecord, type ExecutionSession } from "@alneas/appkit-core/ai";

/** Creates a local session and subscribes to its bounded history. Unmount requests cancellation. */
export function useExecutionSession(): { session: ExecutionSession; history: readonly ExecutionRecord[] } {
  const [session] = useState(() => createExecutionSession());
  useLayoutEffect(() => () => { session.cancel(); }, [session]);
  const history = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { session, history };
}
