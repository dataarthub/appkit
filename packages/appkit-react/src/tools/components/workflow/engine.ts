import { WorkflowEngine as CoreWorkflowEngine } from "@alneas/appkit-core/data";
import type { StatusTransition, WorkflowActionDefinition, WorkflowStatusInfo } from './types';

/** Same runtime constructor, specialized with React presentation metadata. */
export const WorkflowEngine = CoreWorkflowEngine<
  StatusTransition,
  WorkflowActionDefinition,
  WorkflowStatusInfo
>;
export type WorkflowEngine = InstanceType<typeof WorkflowEngine>;
