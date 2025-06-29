
'use client'

import { useState, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { getNumberList, updateAdminSettings } from '@/app/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '../ui/textarea';

export function NumberManagementTab() {
    const { toast } = useToast();
    const [numberList, setNumberList] = useState<string[]>([]);
    const [newNumber, setNewNumber] = useState('');
    const [bulkNumbers, setBulkNumbers] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    useEffect(() => {
        async function loadNumbers() {
            setIsFetching(true);
            const result = await getNumberList();
            setNumberList(result || []);
            setIsFetching(false);
        }
        loadNumbers();
    }, []);

    const handleAddNumber = () => {
        if (newNumber.trim() && !numberList.includes(newNumber.trim())) {
            setNumberList([...numberList, newNumber.trim()]);
            setNewNumber('');
        }
    };

    const handleRemoveNumber = (numberToRemove: string) => {
        setNumberList(numberList.filter(num => num !== numberToRemove));
    };

    const handleBulkAdd = () => {
        const numbersToAdd = bulkNumbers
            .split('\n')
            .map(n => n.trim())
            .filter(n => n && !numberList.includes(n));
            
        if (numbersToAdd.length > 0) {
            const uniqueNewNumbers = [...new Set(numbersToAdd)];
            setNumberList([...numberList, ...uniqueNewNumbers]);
            setBulkNumbers('');
            toast({ title: `${uniqueNewNumbers.length} new numbers added.` });
        } else {
             toast({ variant: 'destructive', title: 'No new numbers to add', description: 'All numbers are either empty or already in the list.' });
        }
    };

    const handleRemoveAll = () => {
        setNumberList([]);
        setIsAlertOpen(false);
        toast({ title: 'All Numbers Cleared', description: 'Click "Save Number List" to apply this change.' });
    };
    
    const handleSave = async () => {
        setIsLoading(true);
        const result = await updateAdminSettings({ numberList });
        if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to save numbers', description: result.error });
        } else {
            toast({ title: 'Public Number List Saved' });
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
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will remove all {numberList.length} numbers from the public list. You will still need to save this change.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveAll}
                            className={buttonVariants({ variant: 'destructive' })}
                        >
                            Yes, Remove All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Card>
                <CardHeader>
                     <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Public Number List</CardTitle>
                            <CardDescription>Manage the list of public numbers available to all users. There are currently {numberList.length} numbers.</CardDescription>
                        </div>
                        {numberList.length > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setIsAlertOpen(true)}
                                disabled={isLoading}
                                className="ml-4"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove All
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-60 w-full rounded-md border">
                        <div className="p-4 space-y-2">
                            {numberList.length > 0 ? (
                                numberList.map(num => (
                                    <div key={num} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                                        <span className="font-mono text-sm">{num}</span>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveNumber(num)} disabled={isLoading}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-10">No public numbers added yet.</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Add Single Public Number</CardTitle>
                    <CardDescription>Manually add a single number to the public list.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex gap-2">
                        <Input 
                            value={newNumber}
                            onChange={(e) => setNewNumber(e.target.value)}
                            placeholder="Enter a new number"
                            disabled={isLoading}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNumber()}
                        />
                        <Button onClick={handleAddNumber} disabled={isLoading || !newNumber.trim()}>Add</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bulk Upload Public Numbers</CardTitle>
                    <CardDescription>Paste a list of numbers, one per line, to add them all at once to the public list.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Paste numbers here, one per line..."
                        value={bulkNumbers}
                        onChange={(e) => setBulkNumbers(e.target.value)}
                        className="h-40"
                        disabled={isLoading}
                    />
                    <Button onClick={handleBulkAdd} disabled={isLoading || !bulkNumbers.trim()}>Add Numbers from List</Button>
                </CardContent>
            </Card>

             <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} size="lg">
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Save Public Number List
                </Button>
            </div>
        </div>
    );
}
