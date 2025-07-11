
'use client';

import { useState, useEffect } from 'react';
import { getCombinedNumberList, addPublicNumbers } from "@/app/actions/user-profile";
import { getActiveOtpNumbers } from "@/app/actions/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, LoaderCircle, Lock, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const NumberItem = ({ number, isHighlighted }: { number: string, isHighlighted: boolean }) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = async (numberToCopy: string) => {
        try {
            await navigator.clipboard.writeText(numberToCopy);
            toast({ title: 'Copied!' });
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            // Fallback for insecure contexts (HTTP) or permission errors
            try {
                const textArea = document.createElement("textarea");
                textArea.value = numberToCopy;
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
                    toast({ title: 'Copied!' });
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
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
    };

    return (
        <li className="flex items-center justify-between p-3 bg-muted/50 rounded-md transition-colors hover:bg-muted group">
            <span className={cn("font-mono text-sm", {
                "font-semibold text-green-600 dark:text-green-500": isHighlighted
            })}>{number}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleCopy(number)}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
        </li>
    );
}

export default function NumberListPage() {
    const { user, loading: authLoading } = useAuth();
    const [publicNumbers, setPublicNumbers] = useState<string[]>([]);
    const [privateNumbers, setPrivateNumbers] = useState<string[]>([]);
    const [activeOtpNumbers, setActiveOtpNumbers] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [bulkNumbers, setBulkNumbers] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function loadNumbers() {
            setIsLoading(true);
            const [listResult, activeResult] = await Promise.all([
                getCombinedNumberList(),
                getActiveOtpNumbers()
            ]);

            if (listResult.error) {
                toast({ variant: "destructive", title: "Failed to load numbers", description: listResult.error });
            } else {
                setPublicNumbers(listResult.publicNumbers);
                setPrivateNumbers(listResult.privateNumbers);
            }
            
            if (activeResult.error) {
                console.error("Failed to fetch active OTP numbers:", activeResult.error);
                setActiveOtpNumbers(new Set());
            } else {
                setActiveOtpNumbers(new Set(activeResult.activeNumbers || []));
            }

            setIsLoading(false);
        }
        loadNumbers();
    }, [toast]);
    
    const handleAddPublicNumbers = async () => {
        if (!bulkNumbers.trim()) return;
        setIsAdding(true);
        const result = await addPublicNumbers(bulkNumbers);
        setIsAdding(false);

        if (result.error) {
            toast({ variant: "destructive", title: "Failed to add numbers", description: result.error });
        } else {
            setPublicNumbers(result.newList || []);
            setBulkNumbers('');
            toast({ title: `${result.addedCount} public numbers added.` });
        }
    };


    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Number Lists</h1>
                <p className="text-muted-foreground mt-1">
                    Public numbers are available to all users. Private numbers are assigned specifically to your account by an administrator.
                </p>
            </header>

            {isLoading || authLoading ? (
                <div className="flex justify-center items-center py-20">
                    <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-6 w-6" />
                                Private Numbers
                            </CardTitle>
                            <CardDescription>Numbers assigned specifically to you by an admin.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <ScrollArea className="h-72 w-full rounded-md border">
                                <div className="p-4">
                                    {privateNumbers.length > 0 ? (
                                        <ul className="space-y-3">
                                            {privateNumbers.map((number, index) => (
                                                <NumberItem key={index} number={number} isHighlighted={activeOtpNumbers.has(number)} />
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex items-center justify-center h-full py-10 text-muted-foreground">
                                            <p>This list is currently empty.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-6 w-6" />
                                Public Numbers
                            </CardTitle>
                            <CardDescription>Numbers available to every user in the organization.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <ScrollArea className="h-72 w-full rounded-md border">
                                <div className="p-4">
                                    {publicNumbers.length > 0 ? (
                                        <ul className="space-y-3">
                                            {publicNumbers.map((number, index) => (
                                                <NumberItem key={index} number={number} isHighlighted={activeOtpNumbers.has(number)} />
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex items-center justify-center h-full py-10 text-muted-foreground">
                                            <p>This list is currently empty.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                        {user?.canManageNumbers && (
                             <CardFooter className="flex-col items-start gap-2">
                                <Label htmlFor="bulk-add" className="text-sm font-medium">Add to Public List</Label>
                                 <Textarea
                                    id="bulk-add"
                                    placeholder="Paste numbers here, one per line..."
                                    value={bulkNumbers}
                                    onChange={(e) => setBulkNumbers(e.target.value)}
                                    className="h-24"
                                    disabled={isAdding}
                                />
                                <Button onClick={handleAddPublicNumbers} disabled={isAdding || !bulkNumbers.trim()}>
                                    {isAdding ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Add Numbers
                                </Button>
                             </CardFooter>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
