# core-validation

Use the actual Appkit AI schema validator to validate an object with required name (string minLength 2) and amount (number minimum 0), additionalProperties false. Return its valid/errors result without inventing helper APIs.

Read the installed package instructions and catalogs. Write only the allowed solution file. Use the exact contract below.

```typescript
export declare function validateRecord(data: unknown): {valid: boolean; errors: readonly string[]};
```
