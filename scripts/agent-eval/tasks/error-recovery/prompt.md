# error-recovery

Fix the deliberately nonexistent validator import in starter/solution.ts. Validate objects with required name string minLength 2 using a real Appkit API, preserving invalid-input rejection.

Read the installed package instructions and catalogs. Write only the allowed solution file. Use the exact contract below.

```typescript
export declare function validateName(data: unknown): {valid: boolean; errors: readonly string[]};
```
