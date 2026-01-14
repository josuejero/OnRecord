import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ErrorStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  message?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  homeLabel?: string;
  homeHref?: string;
};

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  homeLabel = 'Go home',
  homeHref = '/',
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 text-center',
        className,
      )}
      {...props}
    >
      <p className="text-xs uppercase tracking-widest text-slate-400">Error</p>
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
        <Link
          href={homeHref}
          className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
