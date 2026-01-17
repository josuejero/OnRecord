import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ToolbarProps = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function Toolbar({ left, right, className }: ToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {left ? <div className="flex flex-wrap items-center gap-2">{left}</div> : null}
      {right ? <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}
