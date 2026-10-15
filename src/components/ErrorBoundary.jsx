import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TerraPulse 3D Viewport caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="canvas-error-fallback">
          <div className="error-card">
            <div className="error-icon-wrapper">
              <AlertCircle size={36} className="text-amber" />
            </div>
            <h3>{this.props.title || '3D Farm Simulation Offline'}</h3>
            <p className="error-message">
              {this.state.error?.message ||
                'WebGL context failed to initialize or hardware acceleration is unavailable.'}
            </p>
            <div className="error-tip">
              <span>{this.props.tipText || 'Telemetry data and automated irrigation logic remain active.'}</span>
            </div>
            <button type="button" className="btn-retry" onClick={this.handleReset}>
              <RotateCcw size={16} />
              <span>{this.props.retryText || 'Retry WebGL Canvas'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
