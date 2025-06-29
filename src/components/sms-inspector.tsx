
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfDay, endOfDay, subDays, differenceInDays } from 'date-fns';
import { CalendarIcon, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { fetchSmsData } from '@/app/actions';
import { SmsTable } from '@/components/sms-table';
import type { SmsRecord } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const formSchema = z.object({
  startDate: z.date({ required_error: 'A start date is required.'}),
  endDate: z.date({ required_error: 'An end date is required.'}),
  senderId: z.string().optional(),
  phone: z.string().optional(),
}).superRefine(({ startDate, endDate }, ctx) => {
    if (startDate && endDate) {
        if (endDate < startDate) {
            ctx.addIssue({
                code: 'custom',
                message: 'End date must be after start date.',
                path: ['endDate'],
            });
            return;
        }
        if (differenceInDays(endDate, startDate) > 1) {
            ctx.addIssue({
                code: 'custom',
                message: 'The date range can be a maximum of two days.',
                path: ['endDate'],
            });
        }
    }
});

interface SmsInspectorProps {
    initialRecords?: SmsRecord[];
    initialError?: string;
}


export function SmsInspector({ initialRecords = [], initialError }: SmsInspectorProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<SmsRecord[]>(initialRecords);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: startOfDay(subDays(new Date(), 1)),
      endDate: endOfDay(new Date()),
      senderId: '',
      phone: '',
    },
  });
  
  // Show initial error if there was one during server-side fetch
  useEffect(() => {
    if (initialError) {
        toast({
            variant: 'destructive',
            title: 'Failed to fetch data',
            description: initialError,
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialError]);

  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setRecords([]);
    const result = await fetchSmsData(values);
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
        });
      } else {
        setRecords(result.data);
        toast({
          title: 'Data Loaded',
          description: `${result.data.length} records found.`,
        });
      }
    }
  }, [toast]);
  
  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
              <CardHeader>
                  <CardTitle>SMS Filters</CardTitle>
                  <CardDescription>Use the filters below to fetch SMS records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                              <PopoverTrigger asChild>
                              <FormControl>
                                  <Button
                                  variant={'outline'}
                                  className={cn(
                                      'w-full justify-start text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                  )}
                                  >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                  </Button>
                              </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                              <Calendar 
                                mode="single" 
                                selected={field.value} 
                                onSelect={(date) => field.onChange(date ? startOfDay(date) : undefined)} 
                                initialFocus 
                              />
                              </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                              <PopoverTrigger asChild>
                              <FormControl>
                                  <Button
                                  variant={'outline'}
                                  className={cn(
                                      'w-full justify-start text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                  )}
                                  >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                  </Button>
                              </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                  mode="single" 
                                  selected={field.value} 
                                  onSelect={(date) => field.onChange(date ? endOfDay(date) : undefined)} 
                                  initialFocus 
                                />
                              </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="senderId"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sender ID</FormLabel>
                          <FormControl>
                              <Input placeholder="e.g., Telegram" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                              <Input placeholder="e.g., 23674400423" {...field} />
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
                      {isLoading ? 'Fetching...' : 'Fetch SMS'}
                  </Button>
              </CardFooter>
          </Card>
        </form>
      </Form>
      
      <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                      <CardTitle>Received SMS Messages</CardTitle>
                      <CardDescription>{records.length} messages found</CardDescription>
                  </div>
              </div>
          </CardHeader>
          <CardContent>
              <SmsTable records={records} isLoading={isLoading} />
          </CardContent>
      </Card>
    </div>
  );
}
