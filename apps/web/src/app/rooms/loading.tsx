import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const roomSkeletons = Array.from({ length: 6 }, (_, index) => index);

export default function RoomsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-2 text-slate-500">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-28" />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {roomSkeletons.map((item) => (
          <Card
            key={item}
            className="border border-slate-200 bg-white shadow-sm transition hover:shadow-lg"
          >
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
