import { type ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
      {children}
    </kbd>
  );
}
