'use client';

import { ErrorState } from '@/components/error-state';

type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function LabelerError({ reset }: RouteErrorProps) {
  return (
    <ErrorState
      title="Something went wrong loading the labeler"
      message="We couldn’t fetch the labels for this session. Try again or return to rooms to pick a different session."
      onRetry={reset}
      homeHref="/rooms"
      homeLabel="Rooms"
    />
  );
}
