import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * Catches failures in the atmosphere/clouds layer (e.g. the precompute
 * step, texture loading) so they fall back to the base tiles scene
 * instead of crashing the app — per the v2-atmosphere-clouds spec's
 * "graceful degradation on failure" requirement. React has no hook-based
 * equivalent; a class component is the only way to implement this.
 */
export class AtmosphereCloudsErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.warn('Atmosphere/clouds layer failed, falling back to base tiles scene:', error);
    this.props.onError();
  }

  override render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
