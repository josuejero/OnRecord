import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

type TableSize = 'default' | 'dense';

type TableContextValue = {
  size: TableSize;
  stickyHeader: boolean;
};

const defaultTableContext: TableContextValue = {
  size: 'default',
  stickyHeader: false,
};

const TableContext = React.createContext<TableContextValue>(defaultTableContext);

const tableBase = cva('w-full text-sm', {
  variants: {
    variant: {
      default: 'border-separate border-spacing-0',
    },
  },
});

const tableRowVariants = cva('border-b border-slate-100 transition-colors', {
  variants: {
    hover: {
      true: 'hover:bg-slate-50/60',
      false: '',
    },
    selected: {
      true: 'bg-slate-100/80',
      false: '',
    },
  },
  defaultVariants: {
    hover: true,
  },
});

const cellPadding = cva('first:pl-0 last:pr-0', {
  variants: {
    size: {
      default: 'px-4 py-3',
      dense: 'px-3 py-2',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  size?: TableSize;
  stickyHeader?: boolean;
};

const Table = React.forwardRef<HTMLTableElement, TableProps>(function Table(
  { className, size = 'default', stickyHeader = false, ...props },
  ref,
) {
  return (
    <TableContext.Provider value={{ size, stickyHeader }}>
      <table ref={ref} className={cn(tableBase(), className)} {...props} />
    </TableContext.Provider>
  );
});

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  function TableHeader({ className, ...props }, ref) {
    return (
      <thead
        ref={ref}
        className={cn('bg-slate-50 text-xs uppercase tracking-wide text-slate-500', className)}
        {...props}
      />
    );
  },
);

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  function TableBody({ className, ...props }, ref) {
    return <tbody ref={ref} className={cn('bg-white', className)} {...props} />;
  },
);

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  function TableFooter({ className, ...props }, ref) {
    return <tfoot ref={ref} className={cn('bg-slate-50 text-xs text-slate-500', className)} {...props} />;
  },
);

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  function TableCaption({ className, ...props }, ref) {
    return (
      <caption ref={ref} className={cn('mt-2 text-xs text-slate-500', className)} {...props} />
    );
  },
);

type TableRowProps = React.ComponentProps<'tr'> & {
  hover?: boolean;
  selected?: boolean;
};

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { className, hover, selected, ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      className={cn(tableRowVariants({ hover, selected }), className)}
      data-selected={selected ? 'true' : undefined}
      {...props}
    />
  );
});

type TableHeadCellProps = React.ComponentProps<'th'> & {
  size?: TableSize;
  sticky?: boolean;
};

const TableHeadCell = React.forwardRef<HTMLTableCellElement, TableHeadCellProps>(function TableHeadCell(
  { className, size, sticky, ...props },
  ref,
) {
  const context = React.useContext(TableContext);
  const cellSize = size ?? context.size;
  const isSticky = sticky ?? context.stickyHeader;

  return (
    <th
      ref={ref}
      scope="col"
      className={cn(
        'text-left text-xs font-semibold uppercase tracking-wide text-slate-600',
        cellPadding({ size: cellSize }),
        isSticky && 'sticky top-0 z-20 bg-slate-50/95 backdrop-blur',
        className,
      )}
      {...props}
    />
  );
});

type TableCellProps = React.ComponentProps<'td'> & {
  size?: TableSize;
};

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { className, size, ...props },
  ref,
) {
  const context = React.useContext(TableContext);

  return (
    <td
      ref={ref}
      className={cn(
        'text-sm text-slate-700',
        cellPadding({ size: size ?? context.size }),
        className,
      )}
      {...props}
    />
  );
});

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableCaption,
  TableRow,
  TableHeadCell,
  TableCell,
  type TableSize,
};
