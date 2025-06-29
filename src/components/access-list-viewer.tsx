
'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { fetchAccessListData } from '@/app/actions';
import { AccessListTable } from '@/components/access-list-table';
import type { AccessListRecord } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const formSchema = z.object({
  origin: z.string().min(1, { message: 'Sender (Origin) is required to search.' }),
  destination: z.string().optional(),
  message: z.string().optional(),
});

export function AccessListViewer() {
  const { toast } = useToast();
  const [records, setRecords] = useState<AccessListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      origin: '',
      destination: '',
      message: '',
    },
  });

  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setRecords([]);
    const result = await fetchAccessListData(values);
    setIsLoading(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Failed to fetch data',
        description: result.error,
      });
    } else if (result.data) {
      if (result.data.length === 0) {
        toast({
          title: 'No Records Found',
          description: 'Your search returned no results. Try different filters.',
        });
      } else {
        toast({
          title: 'Data Loaded',
          description: `${result.data.length} records found.`,
        });
      }
      setRecords(result.data);
    }
  }, [toast]);
  
  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
              <CardHeader>
                  <CardTitle>Access List</CardTitle>
                  <CardDescription>Use the filters below to search the access list. Sender (Origin) is required.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Origin (Sender)</FormLabel>
                          <FormControl>
                              <Input placeholder="e.g., Telegram" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination</FormLabel>
                          <FormControl>
                              <Input placeholder="Country or network" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Content</FormLabel>
                          <FormControl>
                              <Input placeholder="e.g., code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                      {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isLoading ? 'Searching...' : 'Search Access List'}
                  </Button>
              </CardFooter>
          </Card>
        </form>
      </Form>
      
      <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                      <CardTitle>Access List Results</CardTitle>
                      <CardDescription>{records.length} records found</CardDescription>
                  </div>
              </div>
          </CardHeader>
          <CardContent>
              <AccessListTable records={records} isLoading={isLoading} />
          </CardContent>
      </Card>
    </div>
  );
}
