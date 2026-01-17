import { Skeleton } from '@/components/ui/skeleton';

const items = Array.from({ length: 3 }, (_, index) => index);
const assets = Array.from({ length: 4 }, (_, index) => index);

export default function RecapLoading() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>

      <section className="space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item}
              className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm"
            >
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-2">
          {assets.map((asset) => (
            <div
              key={asset}
              className="space-y-1 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-24" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </section>
    </main>
  );
}
