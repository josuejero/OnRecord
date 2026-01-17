import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';

import { cn } from '@/lib/utils';

const Command = CommandPrimitive;
const CommandGroup = CommandPrimitive.Group;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Input
    ref={ref}
    className={cn(
      'h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 transition focus:border-slate-400 focus:outline-none focus-visible:ring-0',
      className,
    )}
    {...props}
  />
));
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[360px] overflow-y-auto rounded-2xl bg-white', className)}
    {...props}
  />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn('px-4 py-6 text-sm text-slate-500', className)}
    {...props}
  />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'flex flex-col gap-1 rounded-2xl px-3 py-2 text-sm text-slate-900 transition focus:bg-slate-100 focus:outline-none',
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = 'CommandItem';

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('my-2 h-px bg-slate-100', className)}
    {...props}
  />
));
CommandSeparator.displayName = 'CommandSeparator';

const CommandShortcut = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<'span'>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('text-[0.6rem] uppercase tracking-[0.3em] text-slate-500', className)}
    {...props}
  />
));
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
  CommandSeparator,
  CommandShortcut,
};
