import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Merriweather } from 'next/font/google';

import { UiToaster } from '@/components/ui/sonner';
import { ToastBridge } from '@/components/toast-bridge';

export const metadata: Metadata = {
  title: 'OnRecord',
  description: 'Verified, person-centric press conference rooms with on-record transcripts.',
};

const interFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const serifFont = Merriweather({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${interFont.variable} ${serifFont.variable} ui-text bg-background text-foreground antialiased min-h-screen`}
      >
        <UiToaster />
        <Suspense fallback={null}>
          <ToastBridge />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
