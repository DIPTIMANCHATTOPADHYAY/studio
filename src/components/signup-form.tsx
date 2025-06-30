
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { signup } from '@/app/actions/auth';
import { signupSchema } from '@/lib/schemas';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';


const formSchema = signupSchema.extend({
  captcha: z.string().min(1, { message: 'Please answer the security question.' }),
});

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      captcha: '',
    },
  });

  useEffect(() => {
    // Generate random numbers on client side to avoid hydration mismatch
    setNum1(Math.floor(Math.random() * 10));
    setNum2(Math.floor(Math.random() * 10));
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (parseInt(values.captcha, 10) !== num1 + num2) {
      form.setError('captcha', {
        type: 'manual',
        message: 'Incorrect answer. Please try again.',
      });
      setNum1(Math.floor(Math.random() * 10));
      setNum2(Math.floor(Math.random() * 10));
      form.setValue('captcha', '');
      return;
    }

    setIsLoading(true);
    const { captcha, ...signupValues } = values;
    const result = await signup(signupValues);
    setIsLoading(false);
    
    if (result.error) {
      toast({ variant: 'destructive', title: 'Sign Up Failed', description: result.error });
      setNum1(Math.floor(Math.random() * 10));
      setNum2(Math.floor(Math.random() * 10));
      form.setValue('captcha', '');
    } else if (result.success) {
      setSignupSuccess(true);
    }
  }

  if (signupSuccess) {
    return (
        <Alert variant="default" className="border-green-500 text-center">
            <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
            <AlertTitle className="font-bold">Account Created Successfully!</AlertTitle>
            <AlertDescription className="mt-2">
                Your account is now pending approval from an administrator. You will be notified once it has been activated.
                <div className="mt-4">
                    <Link href="/login">
                        <Button>Back to Login</Button>
                    </Link>
                </div>
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
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
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="captcha"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel className="flex-shrink-0">
                  What is {num1} + {num2} = ?
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Answer"
                    autoComplete="off"
                    className="w-full"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
           {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Sign Up
        </Button>
      </form>
    </Form>
  );
}
