/** Configure all policy decisions explicitly; no product-specific defaults. */
export { WorkflowPolicyEngine } from "@alneas/appkit-core/data";
export type { WorkflowPolicy, TransitionValidationResult } from "@alneas/appkit-core/data";
/** Context fields retained for consumers migrating the former built-in policy. */
export interface PolicyContext {
  documentType: string;
  role: string;
  amount?: number;
  currentStatus: string;
  targetStatus: string;
  data?: Record<string, unknown>;
}
