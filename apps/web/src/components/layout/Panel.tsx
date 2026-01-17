import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PanelProps = {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
};

export function Panel({ children, className, header }: PanelProps) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      {header ? (
        <div className="border-b border-slate-100 px-6 py-4">{header}</div>
      ) : null}
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}

type PanelHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PanelHeader({ title, description, actions, className }: PanelHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {description ? (
        <p className="text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
