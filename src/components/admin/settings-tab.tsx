
'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { getAdminSettings, updateAdminSettings, updateAdminCredentials } from '@/app/actions/settings';
import type { ProxySettings } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const adminCredentialsSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newEmail: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  newPassword: z.string().min(8, { message: 'New password must be at least 8 characters.'}).optional().or(z.literal('')),
}).refine(data => data.newEmail || data.newPassword, {
  message: "You must provide either a new email or a new password.",
  path: ["newEmail"],
});

export function SettingsTab() {
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState('');
    const [proxySettings, setProxySettings] = useState<ProxySettings>({ ip: '', port: '', username: '', password: '' });
    const [signupEnabled, setSignupEnabled] = useState(true);
    const [emailChangeEnabled, setEmailChangeEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    const adminForm = useForm<z.infer<typeof adminCredentialsSchema>>({
        resolver: zodResolver(adminCredentialsSchema),
        defaultValues: { currentPassword: '', newEmail: '', newPassword: '' },
    });
    
    useEffect(() => {
        async function loadSettings() {
            const result = await getAdminSettings();
            if (result.error) {
                 toast({ variant: 'destructive', title: 'Error fetching settings', description: result.error });
            } else {
                setApiKey(result.apiKey || '');
                setProxySettings(result.proxySettings || { ip: '', port: '', username: '', password: '' });
                setSignupEnabled(result.signupEnabled);
                setEmailChangeEnabled(result.emailChangeEnabled);
            }
            setIsLoading(false);
        }
        loadSettings();
    }, [toast]);

    const handleSave = async () => {
        setIsLoading(true);
        const result = await updateAdminSettings({ 
            apiKey, 
            proxySettings, 
            signupEnabled,
            emailChangeEnabled,
        });
        if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to save settings', description: result.error });
        } else {
            toast({ title: 'Settings Saved' });
        }
        setIsLoading(false);
    };

    const handleAdminUpdate = async (values: z.infer<typeof adminCredentialsSchema>) => {
        const result = await updateAdminCredentials(values);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
        } else {
            toast({ title: 'Admin Credentials Updated', description: 'You may need to log in again if you changed your email.' });
            adminForm.reset();
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Administrator Account</CardTitle>
                    <CardDescription>Change the email or password for the primary admin account.</CardDescription>
                </CardHeader>
                <Form {...adminForm}>
                    <form onSubmit={adminForm.handleSubmit(handleAdminUpdate)}>
                        <CardContent className="space-y-4">
                            <FormField
                                control={adminForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <FormControl><Input type="password" placeholder="Enter your current password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={adminForm.control}
                                name="newEmail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Admin Email (Optional)</FormLabel>
                                        <FormControl><Input type="email" placeholder="new.admin@example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={adminForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Admin Password (Optional)</FormLabel>
                                        <FormControl><Input type="password" placeholder="Enter a new secure password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button type="submit" disabled={adminForm.formState.isSubmitting}>
                                {adminForm.formState.isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Update Admin Credentials
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>User & Access Policies</CardTitle>
                    <CardDescription>Manage how users sign up and what they can change.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="signup-enabled" className="cursor-pointer">Allow User Signups</Label>
                            <p className="text-sm text-muted-foreground">
                                Enable or disable new user registration.
                            </p>
                        </div>
                        <Switch
                            id="signup-enabled"
                            checked={signupEnabled}
                            onCheckedChange={setSignupEnabled}
                            disabled={isLoading}
                            aria-label="Toggle user signups"
                        />
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-change-enabled" className="cursor-pointer">Allow Users to Change Email</Label>
                            <p className="text-sm text-muted-foreground">
                               If disabled, users cannot update their email address from settings.
                            </p>
                        </div>
                        <Switch
                            id="email-change-enabled"
                            checked={emailChangeEnabled}
                            onCheckedChange={setEmailChangeEnabled}
                            disabled={isLoading}
                            aria-label="Toggle email change ability"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>API & Proxy Settings</CardTitle>
                    <CardDescription>Configure outbound requests. The proxy connection will be tested on save.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label htmlFor="api-key">Premiumy API Key</Label>
                        <Input
                            id="api-key"
                            type="password"
                            placeholder="Enter your API key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="proxy-ip">Proxy IP Address</Label>
                            <Input
                                id="proxy-ip"
                                placeholder="e.g., 40.81.241.64"
                                value={proxySettings.ip || ''}
                                onChange={(e) => setProxySettings(prev => ({ ...prev, ip: e.target.value }))}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="proxy-port">Proxy Port</Label>
                            <Input
                                id="proxy-port"
                                placeholder="e.g., 3128"
                                value={proxySettings.port || ''}
                                onChange={(e) => setProxySettings(prev => ({ ...prev, port: e.target.value }))}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="proxy-username">Proxy Username (Optional)</Label>
                            <Input
                                id="proxy-username"
                                placeholder="Username"
                                value={proxySettings.username || ''}
                                onChange={(e) => setProxySettings(prev => ({ ...prev, username: e.target.value }))}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="proxy-password">Proxy Password (Optional)</Label>
                            <Input
                                id="proxy-password"
                                type="password"
                                placeholder="Password"
                                value={proxySettings.password || ''}
                                onChange={(e) => setProxySettings(prev => ({ ...prev, password: e.target.value }))}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} size="lg">
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Settings
                </Button>
            </div>
        </div>
    );
}
