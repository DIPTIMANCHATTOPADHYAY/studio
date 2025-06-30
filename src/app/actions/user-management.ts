
'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { getCurrentUser } from './auth';
import type { UserProfile } from '@/lib/types';
import { adminCreateUserSchema, adminResetPasswordSchema } from '@/lib/schemas';


// --- Helpers ---
async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error('Unauthorized: Admin access required.');
  }
}

// --- Admin User Management Actions ---
export async function getAllUsers(): Promise<{ users?: UserProfile[], error?: string }> {
    try {
        await ensureAdmin();
        await connectDB();
        const users = await User.find({ status: { $in: ['active', 'blocked'] } }).select('-password');
        const formattedUsers: UserProfile[] = users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            photoURL: user.photoURL,
            status: user.status,
            isAdmin: user.isAdmin,
            privateNumberList: user.privateNumberList,
            canManageNumbers: user.canManageNumbers,
        }));
        return { users: formattedUsers };
    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function getPendingUsers(): Promise<{ users?: UserProfile[], error?: string }> {
    try {
        await ensureAdmin();
        await connectDB();
        const users = await User.find({ status: 'inactive' }).select('-password').sort({ createdAt: -1 });
        const formattedUsers: UserProfile[] = users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            photoURL: user.photoURL,
            status: user.status,
            isAdmin: user.isAdmin,
            privateNumberList: user.privateNumberList,
            canManageNumbers: user.canManageNumbers,
        }));
        return { users: formattedUsers };
    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function approveUsers(userIds: string[]): Promise<{ success?: boolean; error?: string }> {
    try {
        await ensureAdmin();
        await connectDB();
        
        if (!userIds || userIds.length === 0) {
            return { error: 'No users selected for approval.' };
        }

        await User.updateMany(
            { _id: { $in: userIds }, status: 'inactive' },
            { $set: { status: 'active' } }
        );

        revalidatePath('/admin');
        return { success: true };

    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function toggleUserStatus(id: string, status: 'active' | 'blocked') {
    try {
        await ensureAdmin();
        await connectDB();
        await User.findByIdAndUpdate(id, { status });
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function toggleCanManageNumbers(userId: string, canManage: boolean) {
    try {
        await ensureAdmin();
        await connectDB();
        await User.findByIdAndUpdate(userId, { canManageNumbers: canManage });
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function addPrivateNumbersToUser(userId: string, numbers: string): Promise<{ success?: boolean; error?: string; addedCount?: number, newList?: string[] }> {
    try {
        await ensureAdmin();
        await connectDB();
        
        const user = await User.findById(userId);
        if (!user) {
            return { error: 'User not found.' };
        }

        const numbersToAdd = numbers
            .split('\n')
            .map(n => n.trim())
            .filter(n => n);

        if (numbersToAdd.length === 0) {
            return { error: 'Please provide at least one number.' };
        }
        
        if (!user.privateNumberList) {
            user.privateNumberList = [];
        }

        const currentPrivateListSet = new Set(user.privateNumberList);
        const uniqueNewNumbers = [...new Set(numbersToAdd)].filter(num => !currentPrivateListSet.has(num));

        if (uniqueNewNumbers.length === 0) {
            return { error: 'All provided numbers are already in the private list for this user.' };
        }

        await User.updateOne(
            { _id: userId },
            { $push: { privateNumberList: { $each: uniqueNewNumbers } } }
        );

        const updatedUser = await User.findById(userId);

        revalidatePath('/admin');
        return { success: true, addedCount: uniqueNewNumbers.length, newList: updatedUser?.privateNumberList ?? [] };

    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function removePrivateNumbersFromUser(userId: string, numbersToRemove: string[] | 'all'): Promise<{ success?: boolean; error?: string; newList?: string[] }> {
    try {
        await ensureAdmin();
        await connectDB();
        
        const user = await User.findById(userId);
        if (!user) {
            return { error: 'User not found.' };
        }

        if (numbersToRemove === 'all') {
             await User.updateOne(
                { _id: userId },
                { $set: { privateNumberList: [] } }
            );
        } else {
             if (numbersToRemove.length === 0) {
                return { error: 'Please select at least one number to remove.' };
            }
             await User.updateOne(
                { _id: userId },
                { $pull: { privateNumberList: { $in: numbersToRemove } } }
            );
        }
        
        const updatedUser = await User.findById(userId);

        revalidatePath('/admin');
        return { success: true, newList: updatedUser?.privateNumberList ?? [] };

    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function adminCreateUser(values: z.infer<typeof adminCreateUserSchema>) {
  try {
    await ensureAdmin();
    await connectDB();
    
    const existingUser = await User.findOne({ email: values.email });
    if (existingUser) {
        return { error: 'User with this email already exists.' };
    }
    
    const hashedPassword = await bcrypt.hash(values.password, 10);

    await User.create({
        name: values.name,
        email: values.email,
        password: hashedPassword,
        status: 'active',
        isAdmin: false,
    });
    
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function adminResetUserPassword(values: z.infer<typeof adminResetPasswordSchema>) {
  try {
    await ensureAdmin();
    await connectDB();
    
    const hashedPassword = await bcrypt.hash(values.password, 10);
    
    await User.findByIdAndUpdate(values.userId, { password: hashedPassword });
    
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function adminDeleteUser(userId: string) {
  try {
    await ensureAdmin();
    const currentUser = await getCurrentUser();
    if (currentUser?.id === userId) {
        return { error: 'Administrators cannot delete their own account.' };
    }
    
    await connectDB();
    await User.findByIdAndDelete(userId);
    
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
