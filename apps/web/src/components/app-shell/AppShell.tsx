'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';
import { getNavItemsForRole, type Role } from './nav';

export type RecentRoom = {
  label: string;
  href: string;
};

export type AppShellProps = {
  children: ReactNode;
  user: { email: string | null; displayName?: string | null };
  role: Role;
  environmentLabel: string;
  recentRooms: RecentRoom[];
  includeDev?: boolean;
};

export default function AppShell({
  children,
  user,
  role,
  environmentLabel,
  recentRooms,
  includeDev,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const navItems = useMemo(
    () => getNavItemsForRole(role, includeDev ?? false),
    [includeDev, role],
  );

  const quickActions = useMemo(
    () => navItems.filter((item) => item.group === 'primary').slice(0, 2),
    [navItems],
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        environmentLabel={environmentLabel}
        navItems={navItems}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        role={role}
        user={user}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          navItems={navItems}
          onOpenPalette={() => setPaletteOpen(true)}
          quickActions={quickActions}
          user={user}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
      <CommandPalette
        navItems={navItems}
        recentRooms={recentRooms}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </div>
  );
}
