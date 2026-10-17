/** Framework-free status transition metadata; labels/icons belong to the consumer. */
export interface WorkflowTransition {
  from: string;
  to: string;
  requiresApproval?: boolean;
  requiredFields?: string[];
}
export interface WorkflowAction {
  action: string;
  enabledStatuses: string[];
  required?: boolean;
}
export interface WorkflowDefinition<
  TTransition extends WorkflowTransition = WorkflowTransition,
  TAction extends WorkflowAction = WorkflowAction,
  TInfo = unknown,
> {
  id: string;
  label: string;
  statusOrder: string[];
  transitions: TTransition[];
  actions?: TAction[];
  statusInfo: Record<string, TInfo>;
  defaultStatusInfo: TInfo;
}
/**
 * Read configured transitions/actions/progress without React or product rules.
 * Does not execute transitions, persist state, validate fields or authorize users.
 * Configuration and returned entries retain their original references for compatibility.
 */
export class WorkflowEngine<
  TTransition extends WorkflowTransition = WorkflowTransition,
  TAction extends WorkflowAction = WorkflowAction,
  TInfo = unknown,
> {
  constructor(private config: WorkflowDefinition<TTransition, TAction, TInfo>) {}
  getStatusOrder(): string[] {
    return this.config.statusOrder;
  }
  getTransitions(status: string): TTransition[] {
    return this.config.transitions.filter((t) => t.from === status);
  }
  getActions(status: string): TAction[] {
    return this.config.actions?.filter((a) => a.enabledStatuses.includes(status)) ?? [];
  }
  getStatusInfo(status: string): TInfo {
    return Object.hasOwn(this.config.statusInfo, status)
      ? this.config.statusInfo[status] || this.config.defaultStatusInfo
      : this.config.defaultStatusInfo;
  }
  /** Position-based progress: first known status is 1/N, unknown status is 0. */
  getProgress(status: string): number {
    const index = this.config.statusOrder.indexOf(status);
    return index < 0 ? 0 : ((index + 1) / this.config.statusOrder.length) * 100;
  }
  getLabel(): string {
    return this.config.label;
  }
}
export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
}
/** All decisions must be supplied explicitly by the application. */
export interface WorkflowPolicy<TContext> {
  validateTransition(context: TContext): TransitionValidationResult;
  requiresApproval(context: TContext): boolean;
  getRequiredFields(context: TContext): string[];
}
/** Application-configured policy; contains no monetary threshold or document/status conventions. */
export class WorkflowPolicyEngine<TContext> {
  constructor(private policy: WorkflowPolicy<TContext>) {
    if (
      !policy ||
      ['validateTransition', 'requiresApproval', 'getRequiredFields'].some(
        (key) => typeof policy[key as keyof WorkflowPolicy<TContext>] !== 'function',
      )
    )
      throw new Error('An explicit complete workflow policy is required.');
  }
  validateTransition(context: TContext): TransitionValidationResult {
    return this.policy.validateTransition(context);
  }
  requiresApproval(context: TContext): boolean {
    return this.policy.requiresApproval(context);
  }
  getRequiredFields(context: TContext): string[] {
    return this.policy.getRequiredFields(context);
  }
}
