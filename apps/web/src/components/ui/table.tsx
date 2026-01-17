'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/cn';

type TableContextValue = {
  size: 'dense' | 'sm' | 'md' | 'lg';
  stickyHeader: boolean;
};

const defaultTableContext: TableContextValue = {
  size: 'md',
  stickyHeader: false,
};

const TableContext = React.createContext<TableContextValue>(defaultTableContext);

const tableBase = cva('w-full text-sm', {
  variants: {
    size: {
      dense: 'text-[0.75rem]',
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type TableProps = React.HTMLAttributes<HTMLTableElement> &
  VariantProps<typeof tableBase> & {
    containerClassName?: string;
    stickyHeader?: boolean;
  };

export function Table({ className, containerClassName, size, stickyHeader, ...props }: TableProps) {
  return (
    <TableContext.Provider value={{ size: size ?? 'md', stickyHeader: Boolean(stickyHeader) }}>
      <div className={cn('w-full overflow-auto', containerClassName)}>
        <table className={cn(tableBase({ size }), className)} {...props} />
      </div>
    </TableContext.Provider>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  const ctx = React.useContext(TableContext);

  return (
    <thead
      className={cn(
        'border-b',
        ctx.stickyHeader && 'sticky top-0 z-10 bg-white/95 shadow-sm shadow-white/50 backdrop-blur',
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b transition-colors motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-muted/50 data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  const ctx = React.useContext(TableContext);

  return (
    <th
      className={cn(
        'h-10 px-2 text-left align-middle font-medium text-muted-foreground',
        ctx.size === 'dense' && 'h-6 px-1',
        ctx.size === 'sm' && 'h-8 px-2',
        ctx.size === 'lg' && 'h-12 px-3',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  const ctx = React.useContext(TableContext);

  return (
    <td
      className={cn(
        'p-2 align-middle [&:has([role=checkbox])]:pr-0',
        ctx.size === 'dense' && 'p-1',
        ctx.size === 'sm' && 'p-2',
        ctx.size === 'lg' && 'p-3',
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />;
}
