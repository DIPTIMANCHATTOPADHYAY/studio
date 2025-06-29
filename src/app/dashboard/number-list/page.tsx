
'use client';

import { useState, useEffect } from 'react';
import { getCombinedNumberList } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { List, Copy, Check, LoaderCircle, Lock, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';

const NumberListDisplay = ({ title, numbers, icon: Icon, description }: { title: string, numbers: string[], icon: React.ElementType, description: string }) => {
    const { toast } = useToast();
    const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

    const handleCopy = (number: string) => {
        navigator.clipboard.writeText(number).then(() => {
            toast({ title: 'Copied!' });
            setCopiedNumber(number);
            setTimeout(() => setCopiedNumber(null), 1500);
        }).catch(() => {
            toast({ variant: 'destructive', title: 'Failed to copy' });
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon className="h-6 w-6" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72 w-full rounded-md border">
                    <div className="p-4">
                        {numbers.length > 0 ? (
                            <ul className="space-y-3">
                                {numbers.map((number, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-md cursor-pointer transition-colors hover:bg-muted"
                                        onClick={() => handleCopy(number)}
                                    >
                                        <span className="font-mono text-sm">{number}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground pointer-events-none">
                                            {copiedNumber === number ? (
                                                <Check className="h-4 w-4 text-primary" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </li>
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
    );
};

export default function NumberListPage() {
    const [publicNumbers, setPublicNumbers] = useState<string[]>([]);
    const [privateNumbers, setPrivateNumbers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        async function loadNumbers() {
            setIsLoading(true);
            const result = await getCombinedNumberList();
            if (result.error) {
                toast({ variant: "destructive", title: "Failed to load numbers", description: result.error });
            } else {
                setPublicNumbers(result.publicNumbers);
                setPrivateNumbers(result.privateNumbers);
            }
            setIsLoading(false);
        }
        loadNumbers();
    }, [toast]);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Number Lists</h1>
                <p className="text-muted-foreground mt-1">
                    Public numbers are available to all users. Private numbers are assigned specifically to your account.
                </p>
            </header>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <NumberListDisplay 
                        title="Private Numbers" 
                        numbers={privateNumbers} 
                        icon={Lock}
                        description="Numbers assigned specifically to you by an admin."
                    />
                    <NumberListDisplay 
                        title="Public Numbers" 
                        numbers={publicNumbers} 
                        icon={Globe}
                        description="Numbers available to every user in the organization."
                    />
                </div>
            )}
        </div>
    );
}
