'use client';

import * as React from 'react';

import { ClientErrorBoundary } from '@/components/client-error-boundary';
import { ErrorState } from '@/components/error-state';

type PanelErrorBoundaryProps = {
  title: string;
  retryLabel?: string;
  className?: string;
  children: React.ReactNode;
};

export function PanelErrorBoundary({
  title,
  retryLabel,
  className,
  children,
}: PanelErrorBoundaryProps) {
  return (
    <ClientErrorBoundary
      fallbackRender={({ error, reset }) => (
        <ErrorState
          className={className ?? 'w-full'}
          title={title}
          message={error.message}
          retryLabel={retryLabel ?? 'Try again'}
          onRetry={reset}
        />
      )}
    >
      {children}
    </ClientErrorBoundary>
  );
}
