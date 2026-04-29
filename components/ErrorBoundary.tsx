'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`=== ERROR BOUNDARY (${this.props.componentName || 'Unknown'}) ===`);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Full error object:', error);
    console.error('=== END ERROR BOUNDARY ===');
    
    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            ⚠️ Error in {this.props.componentName || 'component'}
          </h2>
          <div className="text-sm text-red-700">
            <p className="font-medium mb-2">{this.state.error?.message}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-red-600 hover:text-red-800">
                View technical details
              </summary>
              <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-auto max-h-40">
                {this.state.error?.stack || 'No stack trace available'}
              </pre>
            </details>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;