'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function LoginPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [signedInEmail, setSignedInEmail] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // If already signed in (or after sign-in), show a stable "whoami" marker the tests wait for.
  React.useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setSignedInEmail(data.user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user?.email ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setSignedInEmail(data.user?.email ?? email ?? null);

      // Optional: if your app wants to land somewhere else after login, uncomment:
      // router.push('/reporter');
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>

      {error ? (
        <div
          data-testid="login-error"
          role="alert"
          aria-live="assertive"
          className="rounded-md border p-3 text-sm"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="login-email-input">Email</Label>
          <Input
            id="login-email-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="login-password-input">Password</Label>
          <Input
            id="login-password-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password"
          />
        </div>

        <Button type="submit" disabled={pending} data-testid="login-submit">
          Sign in
        </Button>
      </form>

      {signedInEmail ? (
        <section className="rounded-md border p-3">
          <div data-testid="whoami-title" className="text-sm font-medium">
            Signed in
          </div>
          <div className="text-sm opacity-80">{signedInEmail}</div>
        </section>
      ) : null}
    </main>
  );
}
