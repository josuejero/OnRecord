'use client';

import { ErrorState } from '@/components/error-state';

type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function RoomsError({ reset }: RouteErrorProps) {
  return (
    <ErrorState
      title="Something went wrong loading Rooms"
      message="We couldn’t render the rooms list. Try again or head back to the home page."
      onRetry={reset}
      homeHref="/rooms"
      homeLabel="Rooms"
    />
  );
}
