'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

export function UiToaster() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setMounted(true), 0);

    return () => {
      window.clearTimeout(handle);
    };
  }, []);

  return (
    <>
      {mounted ? (
        <div
          data-testid="toaster-mounted"
          className="fixed left-0 top-0 h-px w-px"
          aria-hidden="true"
        />
      ) : null}
      <Toaster
        richColors
        position="bottom-right"
        toastOptions={{
          className:
            'pointer-events-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-2xl shadow-slate-900/25 backdrop-blur motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
          duration: 4000,
        }}
      />
    </>
  );
}
