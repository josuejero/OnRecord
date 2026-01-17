import Link from 'next/link';
import { type ReactNode } from 'react';

import StatusChip from '@/components/status-chip';
import { getFeatureFlags } from '@/lib/config/features';

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  const featureFlags = getFeatureFlags();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-xl font-semibold text-slate-900">
            OnRecord
          </Link>
          <p className="hidden flex-1 text-sm text-slate-500 md:block">
            Credible press conferences, straight from the transcript.
          </p>
          <div className="hidden items-center gap-3 lg:flex">
            <StatusChip flags={featureFlags} />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-4 py-10">{children}</div>
      </main>
    </div>
  );
}
