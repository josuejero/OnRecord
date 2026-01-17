import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>OnRecord</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">
            Verified, person-centric press rooms with moderated question queues, on-record answers,
            transcripts, and public recap pages.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild data-testid="nav-demo-room">
              <Link href="/demo-room">Open Demo Room</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/debug">Health / Debug</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
