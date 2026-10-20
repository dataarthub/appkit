# react-form

Use Appkit FormView inside DataAccessProvider and a React Query provider. Build a schema-driven Appkit RequestForm with required name (minLength 2) and optional reason textarea, accepting the supplied DataAccessAdapter. Include the correct host providers and explicit Appkit styles. Valid submit creates exactly one records row; invalid input creates none.

Read the installed package instructions and catalogs. Write only the allowed solution file. Use the exact contract below.

```typescript
import type {DataAccessAdapter} from '@alneas/appkit-core/data'; import type {ReactElement} from 'react'; export declare function RequestForm(props: {adapter: DataAccessAdapter}): ReactElement;
```
