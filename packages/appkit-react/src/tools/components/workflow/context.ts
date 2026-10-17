import { createContext, useContext } from 'react';
import { WorkflowEngine } from './engine';

export interface WorkflowContextType {
  getEngine: (workflowId: string) => WorkflowEngine;
}

export const WorkflowContext = createContext<WorkflowContextType | null>(null);

/**
 * ワークフローコンテキストを使用するためのフック。
 * @returns ワークフローコンテキスト
 */
export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};
