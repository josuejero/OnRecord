import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const labelRows = Array.from({ length: 3 }, (_, index) => index);

export default function LabelerLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-full" />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.3fr,0.7fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Labels</CardTitle>
              <Skeleton className="h-3 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {labelRows.map((row) => (
              <div key={row} className="rounded border border-slate-200 bg-slate-50/50 p-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create label</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
