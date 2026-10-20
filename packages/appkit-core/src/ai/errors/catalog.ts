/** Static public recovery information. Never add exception values or application configuration. */
export const ERROR_CATALOG = {
 action: {
  NOT_FOUND: {recovery:'Check the registered action and its current lifetime before creating a new proposal.'},
  INVALID_INPUT: {recovery:'Correct the input against the action validator and validate again before requesting approval.'},
  EXECUTION_FAILED: {recovery:'Reconcile whether the operation already changed state before considering another attempt.'},
  CANCELLED: {recovery:'Check completed effects; cancellation does not roll back writes.'},
 },
 tool: {
  INVALID_CALL: {recovery:'Provide a complete call ID, exposed tool name and JSON object arguments.'},
  NOT_EXPOSED: {recovery:'Use only the tools explicitly exposed by this session; request application authorization for additional tools.'},
  NOT_AVAILABLE: {recovery:'Inspect the current action registration; obtain a new proposal and approval if the target changed.'},
  INVALID_INPUT: {recovery:'Correct arguments against the advertised schema and typed parser, then obtain approval for the corrected call.'},
  CANCELLED: {recovery:'Reconcile completed effects; cancellation does not imply rollback.'},
  EXECUTION_FAILED: {recovery:'Ask the application to reconcile the operation and permissions before retrying.'},
  INVALID_OUTPUT: {recovery:'Check the application output projection; never disclose raw handler output as a fallback.'},
  DUPLICATE_CALL: {recovery:'Reconcile the original call outcome with the application; do not bypass duplicate protection.'},
  CALL_LIMIT: {recovery:'Stop this session and let the application review its call budget.'},
  CLOSED: {recovery:'Stop using this session; a new session requires application-owned authorization.'},
 },
 chat: {
  AI_INVALID_CONFIGURATION: {recovery:'Correct the trusted application endpoint, model or response limits.'},
  AI_HTTP_FAILURE: {recovery:'Inspect application-side service availability and authorization; reconcile uncertain effects before retrying.'},
  AI_INVALID_STREAM: {recovery:'Compare the endpoint protocol and conversation history with the selected adapter contract.'},
  AI_INCOMPLETE_STREAM: {recovery:'Treat completion as unknown and reconcile pending calls before retrying.'},
  AI_INVALID_TOOL_CALL: {recovery:'Reject the incomplete or invalid call and inspect its original envelope and advertised schema.'},
  AI_RESPONSE_LIMIT: {recovery:'Reduce response size or deliberately revise the application-owned limit.'},
  AI_FILE_UPLOAD_FAILURE: {recovery:'Inspect the explicit upload handler, accepted file input and disclosure policy.'},
 },
} as const;
