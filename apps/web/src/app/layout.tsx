import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

import StatusChip from '@/components/status-chip';
import { UiToaster } from '@/components/ui/sonner';
import { getFeatureFlags } from '@/lib/config/features';

export const metadata: Metadata = {
  title: 'OnRecord',
  description: 'Verified, person-centric press conference rooms with on-record transcripts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const featureFlags = getFeatureFlags();

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <UiToaster />
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">
              OnRecord
            </Link>

            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-4 text-sm text-slate-600">
                <Link data-testid="nav-debug" href="/debug">
                  Debug
                </Link>
                <Link data-testid="nav-demo-room" href="/demo-room">
                  Demo Room
                </Link>
                <Link data-testid="nav-rooms" href="/rooms">
                  Rooms
                </Link>
                <Link data-testid="nav-reporter" href="/reporter">
                  Reporter
                </Link>
                <Link data-testid="nav-moderator" href="/moderator">
                  Moderator
                </Link>
              </nav>
              <StatusChip flags={featureFlags} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
