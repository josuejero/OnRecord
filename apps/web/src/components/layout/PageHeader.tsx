import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Toolbar } from './Toolbar';

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm', className)}
    >
      {breadcrumbs ? <div className="text-sm text-slate-500">{breadcrumbs}</div> : null}
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold text-slate-900">{title}</h1>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions ? <Toolbar right={actions} className="mt-3 lg:mt-0" /> : null}
      </div>
    </div>
  );
}
