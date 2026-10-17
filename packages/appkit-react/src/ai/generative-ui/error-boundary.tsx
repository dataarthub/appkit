import { Component, type ReactNode } from 'react';

/** Props for MinimalErrorBoundary. */
export interface MinimalErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

/**
 * Lightweight, zero-dependency Error Boundary for safely isolating UI block rendering errors.
 */
export class MinimalErrorBoundary extends Component<MinimalErrorBoundaryProps, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}
