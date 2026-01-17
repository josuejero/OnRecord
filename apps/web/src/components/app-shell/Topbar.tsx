'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/layout/Kbd';
import type { AppNavItem } from './nav';

type TopbarProps = {
  navItems: AppNavItem[];
  quickActions: AppNavItem[];
  onOpenPalette: () => void;
  user: { email: string | null; displayName?: string | null };
};

type BreadcrumbEntry = {
  label: string;
  href: string;
};

function humanizeSegment(segment: string) {
  try {
    const decoded = decodeURIComponent(segment);
    return decoded
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return segment;
  }
}

export default function Topbar({ navItems, quickActions, onOpenPalette, user }: TopbarProps) {
  const pathname = usePathname() ?? '/';
  const segments = pathname.split('/').filter(Boolean);

  const entries: BreadcrumbEntry[] = [];
  if (segments.length > 0) {
    entries.push({ label: 'Home', href: '/' });
  }

  segments.forEach((segment, index) => {
    const partialPath = `/${segments.slice(0, index + 1).join('/')}`;
    const navMatch = navItems.find((item) => item.href === partialPath);
    entries.push({ label: navMatch?.title ?? humanizeSegment(segment), href: partialPath });
  });

  const title = entries.at(-1)?.label ?? 'Overview';
  const breadcrumbTrail = entries.slice(0, -1);
  const userLabel = user.displayName ?? user.email ?? 'Account';
  const userInitial = userLabel.charAt(0).toUpperCase();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {breadcrumbTrail.length === 0 ? (
              <span>Home</span>
            ) : (
              breadcrumbTrail.map((crumb) => (
                <Link key={crumb.href} href={crumb.href} className="hover:text-slate-900">
                  {crumb.label}
                </Link>
              ))
            )}
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {quickActions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {quickActions.map((action) => (
                <Button key={action.href} variant="ghost" size="sm" className="p-1"
                  asChild
                >
                  <Link href={action.href} prefetch={false}>
                    {action.title}
                  </Link>
                </Button>
              ))}
            </div>
          ) : null}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenPalette}
            className="flex items-center gap-2"
            aria-label="Open command palette"
          >
            <span>Search</span>
            <div className="flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </div>
          </Button>

          <details className="relative z-10">
          <summary className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:border-slate-300">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs uppercase text-slate-800">
                {userInitial}
              </span>
              <span>{userLabel}</span>
            </summary>
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
              <Link
                href="/whoami"
                prefetch={false}
                className="block rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
              >
                Who am I?
              </Link>
              <form action="/logout" method="post" className="mt-2">
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-slate-800"
                >
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
