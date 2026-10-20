# approval-boundary

Use Appkit ActionRegistry and createActionToolBridge. Implement an application-owned approval controller for rename_record tool-call events with {recordId,name}, initial session session-1. No tool runs on ingest or tool-result events. Snapshot/validate call inputs and require explicit approve(approvalId); rejected, replaced and previous-session approvals do nothing. Check onAuthorize at execution and call onWrite only if it permits. Expose a minimal pending snapshot. No auto retry.

Read the installed package instructions and catalogs. Write only the allowed solution file. Use the exact contract below.

```typescript
import type {AIChatEvent} from '@alneas/appkit-core/ai'; export declare function createApprovalScenario(onWrite:(args:{recordId:string;name:string})=>Promise<void>,onAuthorize:(args:{recordId:string;name:string;sessionId:string})=>Promise<boolean>): {ingest(event:AIChatEvent):void; pending():{approvalId:string;recordId:string;name:string}|null; approve(id:string):Promise<void>; reject(id:string):void; setSession(id:string):void;close():void};
```
