import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) redirect('/login');
  return data.user;
}

export async function requireRole(allowed: Array<'reporter' | 'moderator' | 'staff' | 'admin_service'>) {
  const supabase = supabaseServer();
  const user = await requireUser();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile?.role) redirect('/login');
  if (!allowed.includes(profile.role as (typeof allowed)[number])) redirect('/whoami');

  return { user, role: profile.role as (typeof allowed)[number] };
}
