import * as React from 'react';
import {
  Command as CommandPrimitive,
  CommandEmpty as CommandEmptyPrimitive,
  CommandGroup as CommandGroupPrimitive,
  CommandInput as CommandInputPrimitive,
  CommandItem as CommandItemPrimitive,
  CommandList as CommandListPrimitive,
  CommandSeparator as CommandSeparatorPrimitive,
} from 'cmdk';

import { cn } from '@/lib/utils';

const Command = CommandPrimitive;
const CommandGroup = CommandGroupPrimitive;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandInputPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandInputPrimitive>
>(({ className, ...props }, ref) => (
  <CommandInputPrimitive
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
  React.ElementRef<typeof CommandListPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandListPrimitive>
>(({ className, ...props }, ref) => (
  <CommandListPrimitive
    ref={ref}
    className={cn('max-h-[360px] overflow-y-auto rounded-2xl bg-white', className)}
    {...props}
  />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandEmptyPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandEmptyPrimitive>
>(({ className, ...props }, ref) => (
  <CommandEmptyPrimitive
    ref={ref}
    className={cn('px-4 py-6 text-sm text-slate-500', className)}
    {...props}
  />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandItemPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandItemPrimitive>
>(({ className, ...props }, ref) => (
  <CommandItemPrimitive
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
  React.ElementRef<typeof CommandSeparatorPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandSeparatorPrimitive>
>(({ className, ...props }, ref) => (
  <CommandSeparatorPrimitive
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
