'use client';

import { ErrorState } from '@/components/error-state';

type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function RoomDetailError({ reset }: RouteErrorProps) {
  return (
    <ErrorState
      title="Something went wrong loading this room"
      message="We ran into an unexpected issue while fetching the session data. Try again or return to the rooms list."
      onRetry={reset}
      homeHref="/rooms"
      homeLabel="Rooms"
    />
  );
}
