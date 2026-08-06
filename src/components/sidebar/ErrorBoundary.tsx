import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Catches render-phase and effect-phase errors in the React tree so a single
// failing component does not unmount the entire plugin UI (which previously
// manifested as the floating rail silently disappearing). Instead we show a
// small, dismissable error box that surfaces the real message for debugging.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AI Chat Navigator] React render error', error, info);
  }

  private handleDismiss = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const { error } = this.state;

      return (
        <div
          style={{
            position: 'fixed',
            left: '12px',
            bottom: '12px',
            maxWidth: '320px',
            zIndex: 2147483647,
            background: '#7f1d1d',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: '8px',
            font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          }}
          onClick={this.handleDismiss}
          title="点击关闭"
        >
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>
            AI Chat Navigator 渲染出错
          </div>
          <div style={{ opacity: 0.92, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error.message || String(error)}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
