'use client';

import { ErrorState } from '@/components/error-state';

type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

export default function RootError({ reset }: RouteErrorProps) {
  return (
    <ErrorState
      title="Something went wrong"
      message="We hit an unexpected issue while rendering this part of the app. Try again to continue."
      onRetry={reset}
    />
  );
}
