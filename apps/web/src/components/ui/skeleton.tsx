import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const skeletonVariants = cva(
  'motion-safe:animate-pulse motion-reduce:animate-none rounded-md bg-slate-200/70 dark:bg-slate-800/40',
  {
    variants: {
      size: {
        default: 'h-4',
        text: 'h-3',
        title: 'h-6',
        avatar: 'h-10 w-10 rounded-full',
        line: 'h-3',
      },
      width: {
        default: 'w-full',
        sm: 'w-24',
        md: 'w-32',
        lg: 'w-48',
      },
    },
    defaultVariants: {
      size: 'default',
      width: 'default',
    },
  },
);

type SkeletonProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof skeletonVariants>;

const Skeleton = React.forwardRef<HTMLSpanElement, SkeletonProps>(function Skeleton(
  { className, size, width, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn(skeletonVariants({ size, width }), className)}
      {...props}
    />
  );
});

export { Skeleton, skeletonVariants };
