import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../../i18n';

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page page--narrow" data-testid="error-screen">
        <h1>{i18n.t('error.title')}</h1>
        <p>{i18n.t('error.body')}</p>
        <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
          {i18n.t('error.reload')}
        </button>
      </main>
    );
  }
}
