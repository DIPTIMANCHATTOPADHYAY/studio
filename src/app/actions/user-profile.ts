'use server';

import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';

import connectDB from '@/lib/mongodb';
import { User, Setting } from '@/lib/models';
import type { UserProfile } from '@/lib/types';
import { getCurrentUser, setAuthCookie } from './auth';
import { userProfileSchema } from '@/lib/schemas';

// --- User Profile Actions ---
export async function updateUserProfile(userId: string, values: z.infer<typeof userProfileSchema>) {
    try {
        const validation = userProfileSchema.safeParse(values);
        if (!validation.success) {
            return { error: 'Invalid data provided.' };
        }

        await connectDB();
        const user = await User.findById(userId);
        if (!user) {
            return { error: 'User not found.' };
        }

        const emailChangeEnabledSetting = await Setting.findOne({ key: 'emailChangeEnabled' });
        const emailChangeEnabled = emailChangeEnabledSetting?.value !== false;

        if (user.email !== values.email && !emailChangeEnabled) {
            return { error: 'Email address cannot be changed at this time.' };
        }
        
        if (user.email !== values.email) {
            const existingUserWithEmail = await User.findOne({ email: values.email, _id: { $ne: userId } });
            if (existingUserWithEmail) {
                return { error: 'This email is already in use by another account.' };
            }
        }

        const updatedUser = await User.findByIdAndUpdate(userId, { name: values.name, email: values.email }, { new: true });
        
        if (!updatedUser) {
            return { error: 'User not found.' };
        }

        // Re-issue a new token with updated information
        const token = jwt.sign(
          { userId: updatedUser._id, isAdmin: updatedUser.isAdmin, status: updatedUser.status },
          process.env.JWT_SECRET!,
          { expiresIn: '1d' }
        );

        setAuthCookie(token);

        return { success: true };
    } catch (error) {
        console.error('Update profile error:', error);
        return { error: 'An unexpected error occurred while updating your profile.' };
    }
}


// --- Number List Actions ---
export async function getNumberList(): Promise<string[]> {
    try {
        await connectDB();
        const numberListSetting = await Setting.findOne({ key: 'numberList' });
        return numberListSetting?.value ?? [];
    } catch (error) {
        console.error('Error fetching number list:', error);
        return [];
    }
}

export async function getCombinedNumberList(): Promise<{ publicNumbers: string[]; privateNumbers: string[]; error?: string }> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { publicNumbers: [], privateNumbers: [], error: 'User not authenticated.' };
        }
        const publicNumbers = await getNumberList();
        return { publicNumbers, privateNumbers: user.privateNumberList || [] };
    } catch (error) {
        return { publicNumbers: [], privateNumbers: [], error: (error as Error).message };
    }
}

export async function addPublicNumbers(numbers: string): Promise<{ success?: boolean; error?: string; addedCount?: number, newList?: string[] }> {
    try {
        const user = await getCurrentUser();
        if (!user) return { error: 'User not authenticated.' };
        if (!user.canManageNumbers) return { error: 'You do not have permission to manage numbers.' };

        const numbersToAdd = numbers
            .split('\n')
            .map(n => n.trim())
            .filter(n => n);

        if (numbersToAdd.length === 0) {
            return { error: 'Please provide at least one number.' };
        }
        
        await connectDB();
        const numberListSetting = await Setting.findOne({ key: 'numberList' });
        const currentPublicList = numberListSetting?.value ?? [];

        const currentPublicListSet = new Set(currentPublicList);
        const uniqueNewNumbers = [...new Set(numbersToAdd)].filter(num => !currentPublicListSet.has(num));

        if (uniqueNewNumbers.length === 0) {
            return { error: 'All provided numbers are already in the public list.' };
        }
        
        const newList = [...currentPublicList, ...uniqueNewNumbers];
        
        await Setting.updateOne(
            { key: 'numberList' },
            { value: newList },
            { upsert: true }
        );

        revalidatePath('/dashboard/number-list');
        return { success: true, addedCount: uniqueNewNumbers.length, newList };

    } catch (error) {
        return { error: (error as Error).message };
    }
}
