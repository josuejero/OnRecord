'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

type TabsProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
  className?: string;
};

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Root ref={ref} className={cn('flex flex-col', className)} {...props} />
  ),
);

Tabs.displayName = TabsPrimitive.Root.displayName;

type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  className?: string;
};

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-center text-sm font-medium text-slate-500 shadow-sm',
        className,
      )}
      {...props}
    />
  ),
);

TabsList.displayName = TabsPrimitive.List.displayName;

type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  className?: string;
};

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-semibold transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow',
      className,
    )}
    {...props}
  />
));

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

type TabsContentProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
  className?: string;
};

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-3 focus-visible:outline-none', className)}
    {...props}
  />
));

TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
