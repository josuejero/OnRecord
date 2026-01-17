'use client';

import { useSearchParams } from 'next/navigation';
import { ErrorState } from '@/components/error-state';

type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function RoomDetailError({ reset }: RouteErrorProps) {
  const searchParams = useSearchParams();
  const hasE2eErrorParam = searchParams.get('__e2e_room_error') === '1';

  const handleRetry = () => {
    if (hasE2eErrorParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete('__e2e_room_error');
      window.location.assign(url.toString());
      return;
    }
    reset();
  };

  return (
    <ErrorState
      title="Something went wrong loading this room"
      message="We ran into an unexpected issue while fetching the session data. Try again or return to the rooms list."
      onRetry={handleRetry}
      homeHref="/rooms"
      homeLabel="Rooms"
    />
  );
}
