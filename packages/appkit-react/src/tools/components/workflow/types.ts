import type {
  WorkflowTransition,
  WorkflowAction,
  WorkflowDefinition,
} from "@alneas/appkit-core/data";
import type React from 'react';

export interface StatusTransition extends WorkflowTransition {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export interface WorkflowActionDefinition extends WorkflowAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export interface WorkflowStatusInfo {
  title: string;
  description: string;
  nextSteps: string[];
  color: string;
  icon?: React.ReactNode;
}

export type WorkflowConfig = WorkflowDefinition<
  StatusTransition,
  WorkflowActionDefinition,
  WorkflowStatusInfo
>;

export interface WorkflowRegistry {
  [workflowId: string]: WorkflowConfig;
}
