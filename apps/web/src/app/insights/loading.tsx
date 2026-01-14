import { Skeleton } from '@/components/ui/skeleton';

const headers = [
  'Room',
  'Session',
  'Answered',
  'Rejected',
  'Rejection rate',
  'Avg time',
  'Top terms',
];
const rows = Array.from({ length: 5 }, (_, index) => index);

export default function InsightsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="rounded-md border bg-white">
        <div className="grid-auto-rows-[auto] grid min-w-[700px] gap-4 border-b px-4 py-3 text-xs font-semibold uppercase text-slate-500 sm:grid-cols-7">
          {headers.map((label) => (
            <Skeleton key={label} className="h-3 w-full" />
          ))}
        </div>
        <div className="space-y-4 px-4 py-6">
          {rows.map((row) => (
            <div key={row} className="grid grid-cols-1 gap-4 text-sm text-slate-600 sm:grid-cols-7">
              {headers.map((label) => (
                <Skeleton key={`${row}-${label}`} className="h-4 w-full rounded-md" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
