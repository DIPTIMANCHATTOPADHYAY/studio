
'use client';

import { useState, Fragment } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { SmsRecord } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmsTableProps {
  records: SmsRecord[];
  isLoading: boolean;
}

const renderMessageWithLink = (message: string, link?: string) => {
  if (!link || !message.includes(link)) {
    return message;
  }
  const parts = message.split(link);
  return (
    <Fragment>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {link}
            </a>
          )}
        </Fragment>
      ))}
    </Fragment>
  );
};


export function SmsTable({ records, isLoading }: SmsTableProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
        await navigator.clipboard.writeText(code);
        toast({ title: 'Code Copied!' });
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
        // Fallback for insecure contexts or permission errors
        try {
            const textArea = document.createElement("textarea");
            textArea.value = code;
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";

            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                toast({ title: 'Code Copied!' });
                setCopiedCode(code);
                setTimeout(() => setCopiedCode(null), 2000);
            } else {
                throw new Error('Fallback copy failed');
            }
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Failed to copy',
                description: 'Your browser may not support this feature.',
            });
        }
    }
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        <Skeleton className="h-12 w-full rounded-md" />
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
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
                <TableHead className="w-[180px]">Datetime</TableHead>
                <TableHead className="w-[150px]">Sender ID</TableHead>
                <TableHead className="w-[150px]">Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="w-[120px]">Rate</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No messages to display. Please validate your API key and set filters.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record, index) => (
                  <TableRow key={`${record.dateTime}-${index}`}>
                    <TableCell className="font-medium whitespace-nowrap align-top">{record.dateTime}</TableCell>
                    <TableCell className="whitespace-nowrap align-top">{record.senderId}</TableCell>
                    <TableCell className="align-top">
                        <div className={cn({
                            "font-semibold text-green-600 dark:text-green-500": record.extractedInfo?.confirmationCode,
                        })}>{record.phone}</div>
                        {record.extractedInfo?.confirmationCode && (
                          <div 
                            className="inline-flex items-center gap-2 cursor-pointer rounded-md bg-primary/10 px-2 py-1 mt-2 text-primary transition-colors hover:bg-primary/20"
                            onClick={() => handleCopyCode(record.extractedInfo.confirmationCode!)}
                          >
                              <span className="font-mono text-sm font-bold">{record.extractedInfo.confirmationCode}</span>
                              <span className="text-primary/80">
                                {copiedCode === record.extractedInfo.confirmationCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </span>
                          </div>
                        )}
                    </TableCell>
                    <TableCell className="align-top whitespace-nowrap">{record.destination}</TableCell>
                    <TableCell className="whitespace-nowrap align-top">{`${record.rate} ${record.currency}`}</TableCell>
                    <TableCell className="align-top">
                      <p className="whitespace-pre-wrap">
                        {renderMessageWithLink(record.message, record.extractedInfo?.link)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </ScrollArea>
    </div>
  );
}
