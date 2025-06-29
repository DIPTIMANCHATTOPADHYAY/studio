'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { getAdminSettings, updateAdminSettings } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ErrorManagementTab() {
    const { toast } = useToast();
    const [mappings, setMappings] = useState<{ reasonCode: string; customMessage: string }[]>([]);
    const [newMapping, setNewMapping] = useState({ reasonCode: '', customMessage: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        async function loadMappings() {
            setIsFetching(true);
            const result = await getAdminSettings();
            if (result.error) {
                toast({ variant: 'destructive', title: 'Failed to load settings', description: result.error });
            } else if (result.errorMappings) {
                setMappings(result.errorMappings);
            }
            setIsFetching(false);
        }
        loadMappings();
    }, [toast]);

    const handleAddMapping = () => {
        if (newMapping.reasonCode.trim() && newMapping.customMessage.trim()) {
            if (mappings.some(m => m.reasonCode === newMapping.reasonCode.trim())) {
                toast({ variant: 'destructive', title: 'Duplicate Reason Code', description: 'This reason code already has a custom message.' });
                return;
            }
            setMappings([...mappings, { ...newMapping, reasonCode: newMapping.reasonCode.trim() }]);
            setNewMapping({ reasonCode: '', customMessage: '' });
        }
    };

    const handleRemoveMapping = (reasonCodeToRemove: string) => {
        setMappings(mappings.filter(m => m.reasonCode !== reasonCodeToRemove));
    };

    const handleSave = async () => {
        setIsLoading(true);
        const result = await updateAdminSettings({ errorMappings: mappings });
        if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to save mappings', description: result.error });
        } else {
            toast({ title: 'Custom Error Messages Saved' });
        }
        setIsLoading(false);
    };

    if (isFetching) {
        return (
            <div className="flex justify-center items-center h-40">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Error Message</CardTitle>
                    <CardDescription>
                        Map a specific API 'reason_code' to a more user-friendly error message.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                         <div className="space-y-2 md:col-span-1">
                            <Label htmlFor="reason-code">API Reason Code</Label>
                            <Input
                                id="reason-code"
                                placeholder="e.g., time_interval_new"
                                value={newMapping.reasonCode}
                                onChange={(e) => setNewMapping({ ...newMapping, reasonCode: e.target.value })}
                                disabled={isLoading}
                            />
                        </div>
                         <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="custom-message">Custom Toast Message</Label>
                            <Input
                                id="custom-message"
                                placeholder="e.g., The date range cannot be more than 2 days."
                                value={newMapping.customMessage}
                                onChange={(e) => setNewMapping({ ...newMapping, customMessage: e.target.value })}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleAddMapping} disabled={isLoading || !newMapping.reasonCode.trim() || !newMapping.customMessage.trim()}>Add Mapping</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Current Error Mappings</CardTitle>
                    <CardDescription>
                       These are the custom error messages that will override default API errors.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-60 w-full rounded-md border">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Reason Code</TableHead>
                                    <TableHead>Custom Message</TableHead>
                                    <TableHead className="text-right w-[100px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mappings.length > 0 ? (
                                    mappings.map(mapping => (
                                        <TableRow key={mapping.reasonCode}>
                                            <TableCell className="font-mono">{mapping.reasonCode}</TableCell>
                                            <TableCell>{mapping.customMessage}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveMapping(mapping.reasonCode)} disabled={isLoading}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            No custom error messages defined.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
             <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} size="lg">
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Mappings
                </Button>
            </div>
        </div>
    );
}
