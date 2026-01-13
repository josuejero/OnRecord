import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getEnv } from '@/lib/env';

function getAuthCookieName(url: string) {
  try {
    const host = new URL(url).hostname;
    const projectRef = host.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return 'sb-auth-token';
  }
}

export function supabaseServer() {
  const env = getEnv();
  const cookieStorePromise = cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      async getAll() {
        const store = await cookieStorePromise;
        return store.getAll();
      },
    },
    cookieOptions: {
      name: getAuthCookieName(env.NEXT_PUBLIC_SUPABASE_URL),
    },
  });
}
