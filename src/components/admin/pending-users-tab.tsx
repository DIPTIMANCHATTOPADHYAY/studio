
'use client'

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, UserCheck } from 'lucide-react';
import { getPendingUsers, approveUsers } from '@/app/actions/user-management';
import type { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

export function PendingUsersTab() {
    const { toast } = useToast();
    const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);

    const fetchPendingUsers = useCallback(async () => {
        setIsLoading(true);
        const result = await getPendingUsers();
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error fetching pending users', description: result.error });
        } else {
            setPendingUsers(result.users || []);
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchPendingUsers();
    }, [fetchPendingUsers]);
    
    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedUsers(pendingUsers.map(u => u.id));
        } else {
            setSelectedUsers([]);
        }
    };
    
    const handleSelectOne = (userId: string, checked: boolean) => {
        if (checked) {
            setSelectedUsers(prev => [...prev, userId]);
        } else {
            setSelectedUsers(prev => prev.filter(id => id !== userId));
        }
    };

    const handleApprove = async (userIds: string[]) => {
        if (userIds.length === 0) return;
        setIsApproving(true);
        const result = await approveUsers(userIds);
        
        if (result.error) {
            toast({ variant: 'destructive', title: 'Approval Failed', description: result.error });
        } else {
            toast({ title: 'Users Approved', description: `${userIds.length} user(s) have been activated.` });
            setSelectedUsers([]);
            await fetchPendingUsers();
        }
        setIsApproving(false);
    };

    return (
         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Pending User Approvals</CardTitle>
                    <CardDescription>Review and approve new user accounts. There are {pendingUsers.length} users waiting.</CardDescription>
                </div>
                {selectedUsers.length > 0 && (
                     <Button onClick={() => handleApprove(selectedUsers)} disabled={isApproving}>
                        {isApproving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Approve Selected ({selectedUsers.length})
                    </Button>
                )}
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
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selectedUsers.length > 0 && selectedUsers.length === pendingUsers.length}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                        disabled={pendingUsers.length === 0}
                                    />
                                </TableHead>
                                <TableHead>User</TableHead>
                                <TableHead className="hidden sm:table-cell">Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingUsers.length > 0 ? pendingUsers.map((user) => (
                                <TableRow key={user.id} data-state={selectedUsers.includes(user.id) ? "selected" : ""}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedUsers.includes(user.id)}
                                            onCheckedChange={(checked) => handleSelectOne(user.id, !!checked)}
                                            aria-label={`Select user ${user.name}`}
                                        />
                                    </TableCell>
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
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleApprove([user.id])} disabled={isApproving}>
                                            <UserCheck className="mr-2 h-4 w-4" />
                                            Approve
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No pending users.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
