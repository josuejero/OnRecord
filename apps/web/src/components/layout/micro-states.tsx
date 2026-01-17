import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Panel } from './Panel';

type SkeletonBlockProps = {
  width?: string;
  height?: string;
  className?: string;
};

export function SkeletonBlock({ width = 'w-full', height = 'h-8', className }: SkeletonBlockProps) {
  return (
    <div
      className={cn(
        'rounded bg-slate-200/70 shadow-inner motion-safe:animate-pulse motion-reduce:animate-none',
        width,
        height,
        className,
      )}
    />
  );
}

type EmptyPanelProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action: ReactNode;
  className?: string;
};

export function EmptyPanel({ icon, title, description, action, className }: EmptyPanelProps) {
  return (
    <Panel className={cn('text-center space-y-3', className)}>
      {icon ? (
        <div className="mx-auto flex h-14 w-14 items-center justify-center">{icon}</div>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="flex justify-center">{action}</div>
    </Panel>
  );
}

type ErrorPanelProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ErrorPanel({ title, description, action, className }: ErrorPanelProps) {
  return (
    <Panel className={cn('space-y-3 border-red-200 text-center', className)}>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-red-700">{title}</h3>
        {description ? <p className="text-sm text-red-600">{description}</p> : null}
      </div>
      {action ? <div className="flex justify-center">{action}</div> : null}
    </Panel>
  );
}
