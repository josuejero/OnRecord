import Link from 'next/link';
import * as React from 'react';

import { Panel } from '@/components/layout';
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
    <Panel
      className={cn(
        'mx-auto max-w-lg space-y-4 rounded-2xl border border-red-200 bg-white px-6 py-6 shadow-sm text-center text-slate-600',
        className,
      )}
      {...props}
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-red-400">Error</p>
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" asChild>
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </Panel>
  );
}
