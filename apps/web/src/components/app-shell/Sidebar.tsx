'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, User2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { AppNavItem, NavGroup, Role } from './nav';
import { NAV_SECTION_LABELS, NAV_SECTION_ORDER } from './nav';

type SidebarProps = {
  navItems: AppNavItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  user: { email: string | null; displayName?: string | null };
  role: Role;
  environmentLabel: string;
};

export default function Sidebar({
  navItems,
  collapsed,
  onToggleCollapse,
  user,
  role,
  environmentLabel,
}: SidebarProps) {
  const pathname = usePathname() ?? '/';

  const sections: Array<{ group: NavGroup; items: AppNavItem[] }> = NAV_SECTION_ORDER.map((group) => ({
    group,
    items: navItems.filter((item) => item.group === group),
  }));

  const userLabel = user.displayName ?? user.email ?? 'Signed in';
  const userInitial = userLabel.charAt(0).toUpperCase();

  const linkBaseClasses =
    'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none';

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-slate-200 bg-white motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3">
        <span className={cn('text-lg font-semibold tracking-tight', collapsed && 'sr-only')}>OnRecord</span>
        <button
          type="button"
          aria-label={collapsed ? 'Expand navigation panel' : 'Collapse navigation panel'}
          className="rounded-md border border-slate-200 p-1 text-slate-500 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:border-slate-300 hover:text-slate-700"
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Primary">
        {sections.map((section) => {
          if (!section.items.length) return null;
          return (
            <div key={section.group} className="mb-5">
              <p
                className={cn(
                  'px-3 text-xs font-semibold uppercase tracking-wide text-slate-500',
                  collapsed && 'sr-only',
                )}
              >
                {NAV_SECTION_LABELS[section.group]}
              </p>
              <div className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={item.title}
                      className={cn(
                        linkBaseClasses,
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        collapsed && 'justify-center',
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-none" aria-hidden="true" />
                      <span className={cn('ml-3 truncate', collapsed && 'sr-only')}>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-3 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
            {userInitial}
          </span>
          <div className={cn('flex-1 truncate text-sm', collapsed && 'sr-only')}>
            <p className="font-medium text-slate-900">{userLabel}</p>
            <p className="text-xs text-slate-500">{role}</p>
          </div>
        </div>
        <div className={cn('mt-3 flex flex-wrap items-center gap-2', collapsed && 'justify-center')}>
          <Badge variant="secondary" className="text-[10px]">
            {role}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {environmentLabel}
          </Badge>
        </div>
        <details className={cn('mt-3 rounded-md border border-slate-100 bg-slate-50 p-2', collapsed && 'sr-only')}>
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <User2 className="h-4 w-4 text-slate-500" />
            Account
          </summary>
          <div className="mt-2 space-y-2 text-sm">
            <Link
              href="/whoami"
              prefetch={false}
              className="block rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              View profile
            </Link>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </details>
      </div>
    </aside>
  );
}
