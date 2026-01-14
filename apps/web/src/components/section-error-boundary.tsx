'use client';

import * as React from 'react';

import { ClientErrorBoundary } from '@/components/client-error-boundary';
import { ErrorState } from '@/components/error-state';

type Props = {
  title: string;
  message?: string;
  showErrorMessage?: boolean;
  retryLabel?: string;
  className?: string;
  children: React.ReactNode;
};

export function SectionErrorBoundary({
  title,
  message,
  showErrorMessage = false,
  retryLabel,
  className,
  children,
}: Props) {
  return (
    <ClientErrorBoundary
      fallbackRender={({ error, reset }) => (
        <ErrorState
          title={title}
          message={message ?? (showErrorMessage ? error.message : undefined)}
          retryLabel={retryLabel}
          className={className}
          onRetry={reset}
        />
      )}
    >
      {children}
    </ClientErrorBoundary>
  );
}
