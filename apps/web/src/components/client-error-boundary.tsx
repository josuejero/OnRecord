'use client';

import * as React from 'react';

import { ErrorState } from '@/components/error-state';

type ClientErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  fallbackRender?: (options: { error: Error; reset: () => void }) => React.ReactNode;
  onReset?: () => void;
};

type ClientErrorBoundaryState = {
  error: Error | null;
};

export class ClientErrorBoundary extends React.Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ClientErrorBoundaryState {
    return { error };
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Client error boundary:', error, info);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({ error: this.state.error, reset: this.reset });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorState
          onRetry={this.reset}
          title="Something went wrong"
          message={this.state.error.message}
        />
      );
    }

    return this.props.children;
  }
}
