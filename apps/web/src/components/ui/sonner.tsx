'use client';

import { Toaster } from 'sonner';

export function UiToaster() {
  return (
    <Toaster
      richColors
      position="bottom-right"
      toastOptions={{
        className: 'border bg-white/90 shadow-lg',
        duration: 4000,
      }}
    />
  );
}
