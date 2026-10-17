import type { JSX as ReactJSX } from 'react';

// dnd-kit 6 exposes JSX.Element in its declarations. React 19 moved the
// definition to React.JSX. Keep this compatibility with the actual React type,
// rather than asking consumers to suppress dependency declaration checking.
declare global {
  namespace JSX {
    interface Element extends ReactJSX.Element {}
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

export {};
