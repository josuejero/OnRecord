import type { ReactNode } from 'react';

import AppShell from '@/components/app-shell/AppShell';
import { getNavItemsForRole, type Role } from '@/components/app-shell/nav';
import { requireUser } from '@/lib/auth/require';
import { supabaseServer } from '@/lib/supabase/server';

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const resolvedRole = ((profile?.role ?? 'reporter') as Role);
  const navItems = getNavItemsForRole(resolvedRole, process.env.NODE_ENV !== 'production');

  const { data: rooms } = await supabase
    .from('rooms')
    .select('slug, title, public_figures ( slug, name )')
    .order('created_at', { ascending: false })
    .limit(6);

  const recentRooms = (rooms ?? [])
    .map((room) => {
      const figure = room.public_figures as { slug?: string; name?: string } | null;
      if (!figure?.slug || !room.slug) return null;

      return {
        label: `${figure.name ?? 'Figure'} · ${room.title}`,
        href: `/rooms/${encodeURIComponent(figure.slug)}/${encodeURIComponent(room.slug)}`,
      };
    })
    .filter((room): room is { label: string; href: string } => Boolean(room));

  const environmentLabel =
    process.env.NEXT_PUBLIC_ENVIRONMENT ??
    process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NODE_ENV ??
    'development';

  return (
    <AppShell
      navItems={navItems}
      user={{
        email: user.email ?? null,
        displayName: profile?.display_name ?? null,
      }}
      role={resolvedRole}
      environmentLabel={environmentLabel}
      recentRooms={recentRooms}
    >
      {children}
    </AppShell>
  );
}
