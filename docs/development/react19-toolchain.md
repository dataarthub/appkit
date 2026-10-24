# React 19 and dependency refresh (unreleased)

This development guide describes the candidate following React 0.2.0. It is outside
the released portal manifest. Install only a confirmed published containing version;
the source branch and its manifest version do not prove registry availability.

## React component and hook compatibility

DOM-ref wrappers receive `ref` as a regular React 19 prop. Existing calls such as
`<Input ref={inputRef} />` retain their public props and ref targets, including
callback-ref cleanup and supported Base UI `render` composition. Custom wrappers
can pass `ref` along with the other props:

```tsx
import type {ComponentProps} from 'react';
import {Input} from '@alneas/appkit-react/ui';

export function NameInput(props: ComponentProps<typeof Input>) {
  return <Input {...props} />;
}
```

Use `ComponentProps<typeof Input>` and `ComponentRef<typeof Input>` for consumer
types. Regular function components do not retain the `ForwardRefExoticComponent`
wrapper type or its internal `.render`/`$$typeof` properties.

Register window keyboard shortcuts with `@alneas/appkit-react/ui/hooks`:

```tsx
import {useKeyboardShortcuts} from '@alneas/appkit-react/ui/hooks';

export function SaveShortcut({save}: {save: () => void}) {
  useKeyboardShortcuts([{key: 's', ctrlKey: true, handler: save}]);
  return null;
}
```

Definitions and handlers use the latest committed values without re-registering
the listener. Pass `false` as the second argument to disable shortcuts. Matching
is case-insensitive, `ctrlKey: true` accepts Ctrl or Meta, and only the first
match runs. Matches prevent the default action unless `preventDefault: false`.
Input, composition and repeat events are not filtered. This hook needs no
provider or stylesheet.

For a headless filter, import `useFilter` from
`@alneas/appkit-react/tools/filter`. It needs no provider or stylesheet:

```tsx
import {useFilter} from '@alneas/appkit-react/tools/filter';

export function StatusFilter({onChange}: {onChange: (filter: Record<string, unknown>) => void}) {
  const {values, setField} = useFilter({
    fields: [{field: 'status', operator: 'eq'}],
    onChange,
  });
  return <input value={String(values.status ?? '')}
    onChange={event => setField('status', event.target.value)} />;
}
```

Changed queries call the latest committed `onChange`. Replacing only the callback
does not replay the existing filter, and equal query contents do not notify again.

## Development tools and supported runtime

Use the latest Node 24 patch (`.nvmrc`) or Node 26+, and Bun 1.4.0. Development
requires `^24.15.0 || >=26.0.0` for jsdom 30; Node 25 is excluded. Published
packages retain Node `>=24.0.0`, verified by isolated packed consumers.

Normal no-emit checks use TypeScript 7.0.2. Compiler API imports, declaration emit,
and evaluation grading retain TypeScript 6.0.3 through Microsoft's compatibility
alias `typescript: npm:@typescript/typescript6@6.0.2`. `@typescript/native` installs
the native checker as `tsc`; the compatible compiler remains `tsc6`. Run
`bun run typecheck:6` to compare package and Storybook checks.

Storybook 10.6.3, Vitest 5.0.5, MSW 3.0.3 and its matching worker, Playwright
1.64.1, jsdom 30.1.3, and compatible runtime/localization dependency updates are
reviewed together. These are candidate selections, not a promise to remain the
latest versions. AI SDK and the deliberate BigNumber 9 comparison fixture are
retained. Native dnd-kit 0.5.1 from the preceding migration is preserved.

## Release and downstream adoption

The containing React candidate remains **0.3.0**, a pre-1.0 minor for the accumulated
breaking DnD API and component wrapper types. Ordinary JSX props, DOM-ref targets
and callback cleanup remain supported; consumers relying on exotic component
internals must use the public React types shown above. This PR does not update
package versions or publish artifacts.

Core remains **0.2.0**, including React's exact Core dependency. Core changes here
are development fixtures/tooling and removal of an obsolete diagnostic comment;
no Core runtime/API correction requires delivery.

After the containing public release is confirmed, downstream owners update their
exact public pin, align the Query pair with the reviewed public dependency,
regenerate owned API/notices records and run their acceptance gates. Separate
repositories keep their lockfiles and published dependencies; disposable candidate
archives are verification inputs only. See the existing
[native DnD migration](dnd-kit-migration.md) for its additional adoption steps.
