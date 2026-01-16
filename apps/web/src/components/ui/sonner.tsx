'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

export function UiToaster() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
          className: 'border bg-white/90 shadow-lg',
          duration: 4000,
        }}
      />
    </>
  );
}
