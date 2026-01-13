import {
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const placeholderRows = Array.from({ length: 10 }, (_, index) => index);
const columnHeaders = [
  'Room',
  'Session',
  'Answered',
  'Rejected',
  'Rejection rate',
  'Avg time-to-answer',
  'Top terms',
];

export default function InsightsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="overflow-x-auto rounded-md border bg-white">
        <Table size="dense" stickyHeader>
          <TableHeader>
            <TableRow>
              {columnHeaders.map((header) => (
                <TableHeadCell key={header}>
                  <Skeleton className="h-3 w-24" />
                </TableHeadCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {placeholderRows.map((row) => (
              <TableRow key={row}>
                {columnHeaders.map((_, columnIndex) => (
                  <TableCell key={`${row}-${columnIndex}`}>
                    <Skeleton className="h-3 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
