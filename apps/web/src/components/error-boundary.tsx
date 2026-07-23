import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application rendering failed', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="error-page" role="alert">
          <p className="eyebrow">Auto Present</p>
          <h1>Something went wrong</h1>
          <p>Please refresh the page. If the problem continues, contact an administrator.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
