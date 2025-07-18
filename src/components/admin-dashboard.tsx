
'use client'

import { Button } from '@/components/ui/button';
import { LogOut, MoreVertical, LayoutGrid } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { UserManagementTab } from './admin/user-management-tab';
import { NumberManagementTab } from './admin/number-management-tab';
import { ErrorManagementTab } from './admin/error-management-tab';
import { SettingsTab } from './admin/settings-tab';
import { AppearanceTab } from './admin/appearance-tab';
import { PendingUsersTab } from './admin/pending-users-tab';

export function AdminDashboard() {
    const handleLogout = async () => {
        await logout();
    }

    return (
        <main className="min-h-screen w-full bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex flex-row justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                        <p className="text-muted-foreground">Welcome to the control center.</p>
                    </div>

                     {/* Desktop Buttons */}
                     <div className="hidden sm:flex items-center gap-2">
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                        <Link href="/dashboard">
                            <Button>Back to App</Button>
                        </Link>
                    </div>

                    {/* Mobile Dropdown */}
                    <div className="sm:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-5 w-5" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard" className="flex items-center w-full">
                                        <LayoutGrid className="mr-2 h-4 w-4" />
                                        <span>Back to App</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                 <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Logout</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="h-auto flex-wrap justify-start">
                        <TabsTrigger value="users">User Management</TabsTrigger>
                        <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
                        <TabsTrigger value="appearance">Appearance</TabsTrigger>
                        <TabsTrigger value="numbers">Number Management</TabsTrigger>
                        <TabsTrigger value="errors">Custom Errors</TabsTrigger>
                        <TabsTrigger value="settings">Advanced</TabsTrigger>
                    </TabsList>
                    <TabsContent value="users" className="mt-4">
                        <UserManagementTab />
                    </TabsContent>
                    <TabsContent value="pending" className="mt-4">
                        <PendingUsersTab />
                    </TabsContent>
                    <TabsContent value="appearance" className="mt-4">
                        <AppearanceTab />
                    </TabsContent>
                    <TabsContent value="numbers" className="mt-4">
                        <NumberManagementTab />
                    </TabsContent>
                    <TabsContent value="errors" className="mt-4">
                        <ErrorManagementTab />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-4">
                        <SettingsTab />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}
