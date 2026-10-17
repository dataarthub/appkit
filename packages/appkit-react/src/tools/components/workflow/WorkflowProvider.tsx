import React, { useMemo } from 'react';
import { WorkflowEngine } from './engine';
import type { WorkflowConfig } from './types';
import { WorkflowContext } from './context';

export interface WorkflowProviderProps {
  configs: Record<string, WorkflowConfig>;
  children: React.ReactNode;
}

/**
 * ワークフローコンテキストを提供するプロバイダーコンポーネント。
 */
export function WorkflowProvider({ configs, children }: WorkflowProviderProps) {
  const engines = useMemo(() => {
    const map: Record<string, WorkflowEngine> = {};
    for (const [id, config] of Object.entries(configs)) {
      map[id] = new WorkflowEngine(config);
    }
    return map;
  }, [configs]);

  const value = useMemo(
    () => ({
      getEngine: (workflowId: string) => {
        const engine = engines[workflowId];
        if (!engine) {
          throw new Error(`Workflow config not found for ID: ${workflowId}`);
        }
        return engine;
      },
    }),
    [engines],
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}
