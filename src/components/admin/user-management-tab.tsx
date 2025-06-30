
'use client'

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, ShieldBan, ShieldCheck, ListPlus, Trash2, UserPlus, Key } from 'lucide-react';
import { 
    getAllUsers, 
    toggleUserStatus, 
    addPrivateNumbersToUser, 
    removePrivateNumbersFromUser, 
    toggleCanManageNumbers, 
    adminCreateUser, 
    adminResetUserPassword, 
    adminDeleteUser,
} from '@/app/actions/user-management';
import { adminCreateUserSchema, adminResetPasswordSchema } from '@/lib/schemas';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';


const createUserFormSchema = adminCreateUserSchema;
const resetPasswordFormSchema = adminResetPasswordSchema.omit({ userId: true });


export function UserManagementTab() {
    const { toast } = useToast();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isNumbersModalOpen, setIsNumbersModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [privateNumbersToAdd, setPrivateNumbersToAdd] = useState('');
    const [isAddingNumbers, setIsAddingNumbers] = useState(false);
    const [numbersToRemove, setNumbersToRemove] = useState<string[]>([]);
    const [isRemovingNumbers, setIsRemovingNumbers] = useState(false);
    
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

    const createUserForm = useForm<z.infer<typeof createUserFormSchema>>({
        resolver: zodResolver(createUserFormSchema),
        defaultValues: { name: '', email: '', password: '' },
    });

    const resetPasswordForm = useForm<z.infer<typeof resetPasswordFormSchema>>({
        resolver: zodResolver(resetPasswordFormSchema),
        defaultValues: { password: '' },
    });


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
            setUsers(currentUsers => currentUsers.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        }
    };
    
    const handleTogglePermission = async (user: UserProfile, canManage: boolean) => {
        const result = await toggleCanManageNumbers(user.id, canManage);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Permission update failed', description: result.error });
        } else {
            toast({ title: 'Permission Updated' });
            setUsers(currentUsers =>
                currentUsers.map(u =>
                    u.id === user.id ? { ...u, canManageNumbers: canManage } : u
                )
            );
        }
    };

    const openManageNumbersModal = (user: UserProfile) => {
        setSelectedUser(user);
        setPrivateNumbersToAdd('');
        setNumbersToRemove([]);
        setIsNumbersModalOpen(true);
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
            setUsers(currentUsers =>
                currentUsers.map(u =>
                    u.id === selectedUser.id ? { ...u, privateNumberList: result.newList } : u
                )
            );
            setSelectedUser(prev => prev ? { ...prev, privateNumberList: result.newList } : null);
            setPrivateNumbersToAdd('');
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
            setSelectedUser(prev => prev ? { ...prev, privateNumberList: result.newList } : null);
            setNumbersToRemove([]);
        }
    };

    const handleCreateUser = async (values: z.infer<typeof createUserFormSchema>) => {
        const result = await adminCreateUser(values);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to create user', description: result.error });
        } else {
            toast({ title: 'User Created Successfully' });
            setIsCreateUserModalOpen(false);
            createUserForm.reset();
            fetchUsers();
        }
    };

    const handleResetPassword = async (values: z.infer<typeof resetPasswordFormSchema>) => {
        if (!selectedUser) return;
        const result = await adminResetUserPassword({ userId: selectedUser.id, password: values.password });
         if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to reset password', description: result.error });
        } else {
            toast({ title: 'Password Reset Successfully' });
            setIsResetPasswordModalOpen(false);
            resetPasswordForm.reset();
        }
    }

    const openResetPasswordModal = (user: UserProfile) => {
        setSelectedUser(user);
        resetPasswordForm.reset();
        setIsResetPasswordModalOpen(true);
    }
    
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        const result = await adminDeleteUser(userToDelete.id);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to delete user', description: result.error });
        } else {
            toast({ title: 'User Deleted Successfully' });
            fetchUsers();
        }
        setUserToDelete(null);
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>View and manage all registered users and their permissions.</CardDescription>
                    </div>
                    <Button onClick={() => setIsCreateUserModalOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create User
                    </Button>
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
                                    <TableHead>Permissions</TableHead>
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
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    id={`can-manage-${user.id}`}
                                                    checked={user.canManageNumbers}
                                                    onCheckedChange={(checked) => handleTogglePermission(user, checked)}
                                                    disabled={user.isAdmin}
                                                    aria-label="Toggle number management permission"
                                                />
                                                <Label htmlFor={`can-manage-${user.id}`} className="text-sm text-muted-foreground whitespace-nowrap">Can Add Numbers</Label>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="outline" size="sm" onClick={() => openManageNumbersModal(user)} disabled={user.isAdmin}>
                                                <ListPlus className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => openResetPasswordModal(user)} disabled={user.isAdmin}>
                                                <Key className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(user)} disabled={user.isAdmin}>
                                                {user.status === 'active' ? <ShieldBan className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-green-600" />}
                                            </Button>
                                             <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} disabled={user.isAdmin}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
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

            {/* Manage Private Numbers Dialog */}
            <Dialog open={isNumbersModalOpen} onOpenChange={setIsNumbersModalOpen}>
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
            
            {/* Create User Dialog */}
            <Dialog open={isCreateUserModalOpen} onOpenChange={setIsCreateUserModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                            Create a new user account with a name, email, and password.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...createUserForm}>
                        <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                            <FormField
                                control={createUserForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createUserForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input type="email" placeholder="name@example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={createUserForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={createUserForm.formState.isSubmitting}>
                                    {createUserForm.formState.isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter a new password for <span className="font-semibold">{selectedUser?.name}</span> ({selectedUser?.email}).
                        </DialogDescription>
                    </DialogHeader>
                     <Form {...resetPasswordForm}>
                        <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                            <FormField
                                control={resetPasswordForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={resetPasswordForm.formState.isSubmitting}>
                                    {resetPasswordForm.formState.isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Reset Password
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            
            {/* Delete User Dialog */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the account for <span className="font-bold">{userToDelete?.name}</span> ({userToDelete?.email}). All associated data will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className={buttonVariants({ variant: 'destructive' })}>
                            Yes, Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
