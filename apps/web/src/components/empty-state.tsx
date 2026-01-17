import * as React from 'react';

import { cn } from '@/lib/utils';

type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  action: React.ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-600 shadow-sm shadow-slate-900/5',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-2xl text-slate-400">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 flex justify-center">{action}</div>
    </div>
  );
}
