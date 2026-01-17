import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingText?: string;
};

export function LoadingButton({
  loading,
  loadingText,
  children,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      {...props}
      disabled={loading || props.disabled}
      aria-busy={loading ?? undefined}
      className={cn('relative', className)}
    >
      <span
        aria-hidden={loading}
        className={cn(
          'flex items-center justify-center transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
          loading ? 'opacity-0' : 'opacity-100',
        )}
      >
        {children}
      </span>
      {loading ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          {loadingText ? <span className="sr-only">{loadingText}</span> : null}
        </span>
      ) : null}
    </Button>
  );
}
