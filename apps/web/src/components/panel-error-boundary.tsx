'use client';

import { ClientErrorBoundary } from '@/components/client-error-boundary';
import { ErrorState } from '@/components/error-state';
import * as React from 'react';

type PanelErrorBoundaryProps = {
  title: string;
  className?: string;
  retryLabel?: string;
  children: React.ReactNode;
};

export function PanelErrorBoundary({
  title,
  className,
  retryLabel = 'Retry',
  children,
}: PanelErrorBoundaryProps) {
  return (
    <ClientErrorBoundary
      fallbackRender={({ error, reset }) => (
        <ErrorState
          title={title}
          message={error.message}
          retryLabel={retryLabel}
          onRetry={reset}
          className={className ?? 'w-full'}
        />
      )}
    >
      {children}
    </ClientErrorBoundary>
  );
}
