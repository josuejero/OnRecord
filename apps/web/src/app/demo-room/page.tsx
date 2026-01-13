import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { demoRoom } from '@/lib/mock/demo';

export default function DemoRoomPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle data-testid="demo-room-title">{demoRoom.roomName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-500">
          <p>
            Public figure: <span className="font-semibold text-slate-900">{demoRoom.publicFigure}</span>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {demoRoom.questions.map((q) => (
          <Card key={q.id} data-testid={`question-${q.id}`}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-slate-900">{q.from}</CardTitle>
              <Badge variant="secondary" className="capitalize">
                {q.status}
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">{q.body}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
