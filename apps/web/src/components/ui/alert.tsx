import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-slate-200 bg-slate-50 text-slate-900',
      error: 'border-red-200 bg-red-50 text-red-800',
      warning: 'border-amber-200 bg-amber-50 text-amber-900',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      info: 'border-sky-200 bg-sky-50 text-sky-900',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;

const assertiveVariants = new Set<AlertProps['variant']>(['error', 'warning']);

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { className, variant, ...props },
  ref,
) {
  const ariaLive = assertiveVariants.has(variant ?? 'default') ? 'assertive' : 'polite';

  return (
    <div
      ref={ref}
      role="alert"
      aria-live={ariaLive}
      className={cn(alertVariants({ variant, className }))}
      {...props}
    />
  );
});

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function AlertTitle({ className, ...props }, ref) {
  return (
    <p ref={ref} className={cn('text-sm font-semibold text-slate-900', className)} {...props} />
  );
});

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function AlertDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('text-sm text-slate-700', className)} {...props} />;
});

export { Alert, AlertTitle, AlertDescription };
