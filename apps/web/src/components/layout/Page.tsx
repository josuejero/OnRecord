import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageProps = {
  children: ReactNode;
  className?: string;
};

export function Page({ children, className }: PageProps) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
