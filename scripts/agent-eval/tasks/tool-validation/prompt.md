# tool-validation

Create an ActionRegistry/ActionToolBridge exposing rename_record with strict object input {name: nonempty string}, rejecting extra properties. It calls onWrite and projects only name (never secret). Implement the exported contract without adding dependency aliases.

Read the installed package instructions and catalogs. Write only the allowed solution file. Use the exact contract below.

```typescript
import type {ActionToolBridge} from '@alneas/appkit-core/ai'; export declare function createToolScenario(onWrite: (args:{name:string})=>Promise<{name:string;secret:string}>): {bridge:ActionToolBridge;close():void};
```
