'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { updateUserProfile } from '@/app/actions';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { CardFooter } from './ui/card';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

interface UserSettingsFormProps {
  user: UserProfile;
  emailChangeEnabled: boolean;
}

export function UserSettingsForm({ user, emailChangeEnabled }: UserSettingsFormProps) {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
    },
  });
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const result = await updateUserProfile(user.id, values);
    setIsLoading(false);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    } else if (result.success) {
      toast({ title: 'Profile Updated' });
      refreshUser();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                    <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input placeholder="your@email.com" {...field} disabled={!emailChangeEnabled} />
                </FormControl>
                 <FormDescription>
                    {!emailChangeEnabled && "Changing your email address has been disabled by an administrator."}
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <CardFooter className="border-t px-0 py-4 -mx-0 -mb-6">
            <div className="flex justify-end w-full">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </CardFooter>
      </form>
    </Form>
  );
}
