
'use client';

import { useState, useEffect } from 'react';
import { getCombinedNumberList, addUserPrivateNumber, removeUserPrivateNumbers } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { List, Copy, Check, LoaderCircle, Lock, Globe, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';

const NumberListDisplay = ({ title, numbers, icon: Icon, description, canManage, onRemove, onAdd }: { 
    title: string, 
    numbers: string[], 
    icon: React.ElementType, 
    description: string,
    canManage?: boolean,
    onRemove?: (number: string) => void,
    onAdd?: (number: string) => void,
}) => {
    const { toast } = useToast();
    const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
    const [newNumber, setNewNumber] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleCopy = (number: string) => {
        navigator.clipboard.writeText(number).then(() => {
            toast({ title: 'Copied!' });
            setCopiedNumber(number);
            setTimeout(() => setCopiedNumber(null), 1500);
        }).catch(() => {
            toast({ variant: 'destructive', title: 'Failed to copy' });
        });
    };
    
    const handleAdd = async () => {
        if (!newNumber.trim() || !onAdd) return;
        setIsAdding(true);
        await onAdd(newNumber);
        setNewNumber('');
        setIsAdding(false);
    }

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon className="h-6 w-6" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-72 w-full rounded-md border">
                    <div className="p-4">
                        {numbers.length > 0 ? (
                            <ul className="space-y-3">
                                {numbers.map((number, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-md transition-colors hover:bg-muted group"
                                    >
                                        <span className="font-mono text-sm">{number}</span>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleCopy(number)}>
                                                {copiedNumber === number ? (
                                                    <Check className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                            {canManage && onRemove && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onRemove(number)}>
                                                     <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex items-center justify-center h-full py-10 text-muted-foreground">
                                <p>{canManage ? "Add your first number below." : "This list is currently empty."}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            {canManage && onAdd && (
                <CardFooter>
                    <div className="w-full flex items-center gap-2">
                         <Input
                            placeholder="Enter a new number"
                            value={newNumber}
                            onChange={(e) => setNewNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            disabled={isAdding}
                         />
                         <Button onClick={handleAdd} disabled={isAdding || !newNumber.trim()}>
                            {isAdding ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                         </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
};

export default function NumberListPage() {
    const { user, loading: authLoading } = useAuth();
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
    
    const handleAddPrivateNumber = async (number: string) => {
        const result = await addUserPrivateNumber(number);
        if (result.error) {
            toast({ variant: "destructive", title: "Failed to add number", description: result.error });
        } else {
            setPrivateNumbers(result.newList || []);
            toast({ title: "Number Added" });
        }
    };

    const handleRemovePrivateNumber = async (number: string) => {
        const result = await removeUserPrivateNumbers([number]);
         if (result.error) {
            toast({ variant: "destructive", title: "Failed to remove number", description: result.error });
        } else {
            setPrivateNumbers(result.newList || []);
            toast({ title: "Number Removed" });
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Number Lists</h1>
                <p className="text-muted-foreground mt-1">
                    Public numbers are available to all users. Private numbers are assigned specifically to your account.
                </p>
            </header>

            {isLoading || authLoading ? (
                <div className="flex justify-center items-center py-20">
                    <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <NumberListDisplay 
                        title="Private Numbers" 
                        numbers={privateNumbers} 
                        icon={Lock}
                        description={user?.canManageNumbers ? "Numbers you manage for your own use." : "Numbers assigned specifically to you by an admin."}
                        canManage={user?.canManageNumbers}
                        onAdd={handleAddPrivateNumber}
                        onRemove={handleRemovePrivateNumber}
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
