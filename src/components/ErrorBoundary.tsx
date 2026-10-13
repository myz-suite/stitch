import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown above the message, e.g. the mode name. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a single bad branch can never blank the whole page.
 * Switching mode (or pressing retry) remounts the subtree and clears the error.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[stitch-web] render error', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h2>界面出错了{this.props.label ? ` · ${this.props.label}` : ''}</h2>
        <p className="crash-msg">{error.message || String(error)}</p>
        <p className="muted-note">
          其它模式仍可使用。点「重试」或切换模式即可恢复；如果反复出现，请刷新页面。
        </p>
        <div className="crash-actions">
          <button type="button" className="btn btn-primary" onClick={this.reset}>
            重试
          </button>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      </div>
    );
  }
}
