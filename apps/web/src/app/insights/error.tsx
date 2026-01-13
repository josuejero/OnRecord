'use client';

import { ErrorState } from '@/components/error-state';

type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function InsightsError({ reset }: RouteErrorProps) {
  return (
    <ErrorState
      title="Something went wrong loading Insights"
      message="Cached metrics could not be retrieved. Try again or open a room session to refresh the cache."
      onRetry={reset}
      homeHref="/insights"
      homeLabel="Insights"
    />
  );
}
