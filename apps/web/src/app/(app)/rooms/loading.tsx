import { Skeleton } from '@/components/ui/skeleton';

const roomSkeletons = Array.from({ length: 6 }, (_, index) => index);

export default function RoomsLoading() {
  return (
    <div data-testid="rooms-loading" className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {roomSkeletons.map((item) => (
          <article
            key={item}
            className="group rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm motion-safe:transition-shadow motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:shadow-lg focus-within:ring-2 focus-within:ring-primary/70 focus-within:ring-offset-2"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>

            <div className="mt-4 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <div className="space-y-1">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-14" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
