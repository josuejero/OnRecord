'use client';

import { ErrorState } from '@/components/error-state';

type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function InsightsError({ reset }: RouteErrorProps) {
  return (
    <ErrorState
      title="Something went wrong loading insights"
      message="We couldn’t render the insights dashboard. Try again or return to rooms."
      onRetry={reset}
      homeHref="/rooms"
      homeLabel="Rooms"
    />
  );
}
