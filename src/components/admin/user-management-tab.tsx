
'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, ShieldBan, ShieldCheck, ListPlus, Trash2 } from 'lucide-react';
import { getAllUsers, toggleUserStatus, addPrivateNumbersToUser, removePrivateNumbersFromUser } from '@/app/actions';
import type { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function UserManagementTab() {
    const { toast } = useToast();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // State for the private number management modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [privateNumbersToAdd, setPrivateNumbersToAdd] = useState('');
    const [isAddingNumbers, setIsAddingNumbers] = useState(false);
    const [numbersToRemove, setNumbersToRemove] = useState<string[]>([]);
    const [isRemovingNumbers, setIsRemovingNumbers] = useState(false);


    const fetchUsers = async () => {
        setIsLoading(true);
        const result = await getAllUsers();
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error fetching users', description: result.error });
        } else {
            setUsers(result.users || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToggleStatus = async (user: UserProfile) => {
        const newStatus = user.status === 'active' ? 'blocked' : 'active';
        const result = await toggleUserStatus(user.id, newStatus);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Update failed', description: result.error });
        } else {
            toast({ title: 'Status Updated' });
            fetchUsers(); // Re-fetch to ensure data consistency
        }
    };
    
    const openManageNumbersModal = (user: UserProfile) => {
        setSelectedUser(user);
        setPrivateNumbersToAdd('');
        setNumbersToRemove([]); // Reset selection when opening modal
        setIsModalOpen(true);
    };

    const handleAddPrivateNumbers = async () => {
        if (!selectedUser || !privateNumbersToAdd.trim()) return;

        setIsAddingNumbers(true);
        const result = await addPrivateNumbersToUser(selectedUser.id, privateNumbersToAdd);
        setIsAddingNumbers(false);

        if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to add numbers', description: result.error });
        } else {
            toast({ title: 'Private Numbers Added', description: `${result.addedCount} new numbers added for ${selectedUser.name}.`});
            // Update the user list locally to reflect changes immediately
            setUsers(currentUsers =>
                currentUsers.map(u =>
                    u.id === selectedUser.id ? { ...u, privateNumberList: result.newList } : u
                )
            );
            setPrivateNumbersToAdd(''); // Clear the textarea
        }
    };

    const handleToggleNumberToRemove = (number: string) => {
        setNumbersToRemove(prev => 
            prev.includes(number) 
                ? prev.filter(n => n !== number)
                : [...prev, number]
        );
    };

    const handleRemoveNumbers = async (type: 'selected' | 'all') => {
        if (!selectedUser) return;
        
        const numbers = type === 'all' ? 'all' : numbersToRemove;

        if (type === 'selected' && numbersToRemove.length === 0) {
            toast({ variant: 'destructive', title: 'No numbers selected' });
            return;
        }

        setIsRemovingNumbers(true);
        const result = await removePrivateNumbersFromUser(selectedUser.id, numbers);
        setIsRemovingNumbers(false);

        if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to remove numbers', description: result.error });
        } else {
            toast({ title: 'Private Numbers Removed' });
            setUsers(currentUsers =>
                currentUsers.map(u =>
                    u.id === selectedUser.id ? { ...u, privateNumberList: result.newList } : u
                )
            );
            setNumbersToRemove([]);
        }
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all registered users and their permissions.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                    <ScrollArea className="h-[60vh] w-full rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={user.photoURL || ''} alt={user.name || 'User'}/>
                                                    <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="font-medium">
                                                {user.name || 'N/A'}
                                                <div className="text-xs text-muted-foreground sm:hidden">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                {user.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => openManageNumbersModal(user)} disabled={user.isAdmin}>
                                                <ListPlus className="h-4 w-4 mr-2"/>
                                                Manage Numbers
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(user)} disabled={user.isAdmin}>
                                                {user.status === 'active' ? <ShieldBan className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-green-600" />}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Manage Private Numbers for {selectedUser?.name}</DialogTitle>
                        <DialogDescription>
                            Add new numbers or remove existing numbers from this user's private list.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold">Current Numbers ({selectedUser?.privateNumberList?.length || 0})</h3>
                                {selectedUser?.privateNumberList && selectedUser.privateNumberList.length > 0 && (
                                    <div className="space-x-2">
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveNumbers('selected')}
                                            disabled={isRemovingNumbers || numbersToRemove.length === 0}
                                        >
                                            {isRemovingNumbers ? <LoaderCircle className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                                            Remove ({numbersToRemove.length})
                                        </Button>
                                        <Button 
                                            variant="destructive" 
                                            size="sm"
                                            onClick={() => handleRemoveNumbers('all')}
                                            disabled={isRemovingNumbers}
                                        >
                                            Remove All
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <ScrollArea className="h-48 w-full rounded-md border">
                                {selectedUser?.privateNumberList && selectedUser.privateNumberList.length > 0 ? (
                                    <div className="p-2">
                                        {selectedUser.privateNumberList.map(num => (
                                            <div key={num} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                                                <Checkbox
                                                    id={`remove-${num}`}
                                                    checked={numbersToRemove.includes(num)}
                                                    onCheckedChange={() => handleToggleNumberToRemove(num)}
                                                    disabled={isAddingNumbers || isRemovingNumbers}
                                                />
                                                <Label htmlFor={`remove-${num}`} className="font-mono text-sm w-full cursor-pointer">
                                                    {num}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                        No private numbers assigned.
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                        <div className="space-y-2">
                             <h3 className="font-semibold">Add New Numbers</h3>
                             <Textarea
                                placeholder="Paste numbers here, one per line..."
                                value={privateNumbersToAdd}
                                onChange={(e) => setPrivateNumbersToAdd(e.target.value)}
                                className="h-40"
                                disabled={isAddingNumbers || isRemovingNumbers}
                            />
                             <Button onClick={handleAddPrivateNumbers} disabled={isAddingNumbers || isRemovingNumbers || !privateNumbersToAdd.trim()}>
                                {isAddingNumbers && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Add Numbers
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" disabled={isAddingNumbers || isRemovingNumbers}>Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
