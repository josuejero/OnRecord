'use client';

import { ErrorState } from '@/components/error-state';

type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function GlobalError({ reset }: RouteErrorProps) {
  return (
    <ErrorState
      title="Something went wrong"
      message="Something unexpected happened. Reload the page or head back home."
      onRetry={reset}
    />
  );
}
