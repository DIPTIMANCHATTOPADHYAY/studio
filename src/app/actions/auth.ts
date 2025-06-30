
'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import connectDB from '@/lib/mongodb';
import { User, Setting } from '@/lib/models';
import type { UserProfile } from '@/lib/types';
import { loginSchema, signupSchema } from '@/lib/schemas';

// --- Auth Helpers ---
function isSecureEnvironment() {
    return process.env.NODE_ENV === 'production' && process.env.FORCE_HTTP !== 'true';
}

export async function setAuthCookie(token: string) {
    cookies().set('token', token, {
      httpOnly: true,
      secure: isSecureEnvironment(),
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
}

// --- Auth Actions ---
export async function getSignupStatus() {
    try {
        await connectDB();
        const signupSetting = await Setting.findOne({ key: 'signupEnabled' }).lean().exec();
        return { signupEnabled: signupSetting?.value === true };
    } catch (error) {
        console.error("Error fetching signup status:", error);
        return { signupEnabled: false };
    }
}

export async function signup(values: z.infer<typeof signupSchema>) {
    try {
        await connectDB();
        
        const { signupEnabled } = await getSignupStatus();
        if (!signupEnabled) {
            return { error: 'User registration is currently disabled by the administrator.' };
        }

        const existingUser = await User.findOne({ email: values.email });
        if (existingUser) {
            return { error: 'User with this email already exists.' };
        }
        
        const hashedPassword = await bcrypt.hash(values.password, 10);

        await User.create({
            name: values.name,
            email: values.email,
            password: hashedPassword,
            status: 'inactive',
            isAdmin: false,
        });

        return { success: true };
    } catch (error) {
        console.error("Signup error:", error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function login(values: z.infer<typeof loginSchema>) {
  try {
    await connectDB();
    const user = await User.findOne({ email: values.email });

    if (!user || !user.password) {
      return { error: 'Invalid email or password.' };
    }

    const isPasswordValid = await bcrypt.compare(values.password, user.password);
    if (!isPasswordValid) {
      return { error: 'Invalid email or password.' };
    }

    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin, status: user.status },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
    
    await setAuthCookie(token);

    return { success: true, isAdmin: user.isAdmin };
  } catch (error) {
    console.error("Login error:", error);
    return { error: 'An unexpected error occurred.' };
  }
}

export async function logout() {
    cookies().delete('token');
    redirect('/');
}

export async function getCurrentUser(): Promise<UserProfile | null> {
    const token = cookies().get('token')?.value;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        await connectDB();
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) return null;

        return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            photoURL: user.photoURL,
            status: user.status,
            isAdmin: user.isAdmin,
            privateNumberList: user.privateNumberList,
            canManageNumbers: user.canManageNumbers,
        };
    } catch (error) {
        return null;
    }
}
