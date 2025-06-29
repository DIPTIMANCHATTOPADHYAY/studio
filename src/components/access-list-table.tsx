
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { AccessListRecord } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AccessListTableProps {
  records: AccessListRecord[];
  isLoading: boolean;
}

export function AccessListTable({ records, isLoading }: AccessListTableProps) {

  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <ScrollArea className="h-[65vh] w-full">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <TableRow>
                <TableHead>Price</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Test Number</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Limits (H/D)</TableHead>
                <TableHead>Datetime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No results to display. Use the filters above to search the access list.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record, index) => (
                  <TableRow key={`${record.datetime}-${index}`}>
                    <TableCell className="font-medium whitespace-nowrap">{record.price} {record.currency}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.accessOrigin}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.accessDestination}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.testNumber}</TableCell>
                    <TableCell>{record.rate}</TableCell>
                    <TableCell className="whitespace-pre-wrap">{record.message}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.limitHour} / {record.limitDay}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.datetime}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </ScrollArea>
    </div>
  );
}
