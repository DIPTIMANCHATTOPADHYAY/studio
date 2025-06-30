
'use server';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { revalidatePath } from 'next/cache';

import connectDB from '@/lib/mongodb';
import { Setting, User } from '@/lib/models';
import type { PublicSettings, AdminSettings, ProxySettings } from '@/lib/types';
import { allColorKeys } from '@/lib/types';
import { getCurrentUser, setAuthCookie } from './auth';

// --- Helpers ---
async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error('Unauthorized: Admin access required.');
  }
}

async function getAllSettingsAsMap(): Promise<{ [key: string]: any }> {
    await connectDB();
    const settings = await Setting.find({}).lean();
    const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {} as { [key: string]: any });
    return settingsMap;
}

async function testProxy(proxy: ProxySettings): Promise<boolean> {
  if (!proxy.ip || !proxy.port) {
    return true; // No proxy to test, so we can save this "empty" configuration.
  }
  try {
    const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    const proxyUrl = `http://${auth}${proxy.ip}:${proxy.port}`;
    const agent = new HttpsProxyAgent(proxyUrl);
    
    const response = await fetch('https://httpbin.org/get', { 
        agent, 
        signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    return response.ok;
  } catch (error) {
    console.error('Proxy test failed:', error);
    return false;
  }
}

// --- Settings Actions ---

const defaultSettings = {
    siteName: 'SMS Inspector 2.0',
    signupEnabled: true,
    emailChangeEnabled: true,
    footerText: '© {YEAR} {SITENAME}. All rights reserved.',
    colorPrimary: '217.2 91.2% 59.8%',
    colorBackground: '0 0% 100%',
    colorForeground: '224 71.4% 4.1%',
    colorCard: '0 0% 100%',
    colorCardForeground: '224 71.4% 4.1%',
    colorPopover: '0 0% 100%',
    colorPopoverForeground: '224 71.4% 4.1%',
    colorPrimaryForeground: '210 20% 98%',
    colorSecondary: '215 27.9% 95.1%',
    colorSecondaryForeground: '224 71.4% 4.1%',
    colorMuted: '215 27.9% 95.1%',
    colorMutedForeground: '215 20.2% 65.1%',
    colorAccent: '215 27.9% 95.1%',
    colorAccentForeground: '224 71.4% 4.1%',
    colorDestructive: '0 84.2% 60.2%',
    colorDestructiveForeground: '210 20% 98%',
    colorBorder: '215 20.2% 90.1%',
    colorInput: '215 20.2% 90.1%',
    colorRing: '217.2 91.2% 59.8%',
    colorSidebarBackground: '217.2 91.2% 59.8%',
    colorSidebarForeground: '210 20% 98%',
    colorSidebarAccent: '222.1 71.1% 50.4%',
    colorSidebarAccentForeground: '210 20% 98%',
    colorSidebarBorder: '222.1 71.1% 50.4%',
};

export async function getPublicSettings(): Promise<PublicSettings> {
    try {
        const settingsMap = await getAllSettingsAsMap();
        
        const publicSettings: PublicSettings = {
            siteName: settingsMap.siteName ?? defaultSettings.siteName,
            signupEnabled: settingsMap.signupEnabled === true,
            emailChangeEnabled: settingsMap.emailChangeEnabled !== false,
            footerText: settingsMap.footerText ?? defaultSettings.footerText,
        };

        for (const key of allColorKeys) {
            publicSettings[key] = settingsMap[key] ?? defaultSettings[key as keyof typeof defaultSettings];
        }

        return publicSettings;

    } catch (error) {
        console.error("Error fetching public settings:", error);
        // Return hardcoded defaults on error to avoid circular dependencies
        const { siteName, signupEnabled, emailChangeEnabled, footerText, ...colors } = defaultSettings;
        return { siteName, signupEnabled, emailChangeEnabled, footerText, ...colors };
    }
}

export async function getAdminSettings(): Promise<Partial<AdminSettings> & { error?: string, defaults?: any }> {
    try {
        const settingsMap = await getAllSettingsAsMap();

        const defaultProxy = { ip: '', port: '', username: '', password: '' };
        const rawProxy = settingsMap.proxySettings;
        const safeProxySettings = (typeof rawProxy === 'object' && rawProxy !== null && !Array.isArray(rawProxy))
            ? rawProxy
            : defaultProxy;

        const allSettings: Partial<AdminSettings> = {
            apiKey: settingsMap.apiKey ?? '',
            proxySettings: {
                ip: safeProxySettings.ip || '',
                port: safeProxySettings.port || '',
                username: safeProxySettings.username || '',
                password: safeProxySettings.password || '',
            },
            signupEnabled: settingsMap.signupEnabled === true,
            siteName: settingsMap.siteName ?? defaultSettings.siteName,
            footerText: settingsMap.footerText ?? defaultSettings.footerText,
            emailChangeEnabled: settingsMap.emailChangeEnabled !== false,
            numberList: settingsMap.numberList ?? [],
            errorMappings: settingsMap.errorMappings ?? [],
        };
        
        for (const key of allColorKeys) {
            allSettings[key] = settingsMap[key] ?? defaultSettings[key as keyof typeof defaultSettings];
        }

        return allSettings

    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function updateAdminSettings(settings: Partial<AdminSettings>) {
    try {
        await ensureAdmin();
        await connectDB();
        const operations = [];

        if (settings.proxySettings !== undefined) {
            const isProxyValid = await testProxy(settings.proxySettings);
            if (!isProxyValid) {
                return { error: 'Proxy test failed. Please check the details and ensure the proxy is active.' };
            }
        }
        
        for (const [key, value] of Object.entries(settings)) {
            if (value !== undefined) {
                operations.push(Setting.findOneAndUpdate(
                    { key },
                    { value },
                    { upsert: true, new: true }
                ));
            }
        }

        await Promise.all(operations);
        
        // Revalidate paths that depend on these settings
        if (settings.apiKey !== undefined || settings.proxySettings !== undefined || settings.errorMappings !== undefined) {
            revalidatePath('/dashboard');
            revalidatePath('/dashboard/access-list');
        }
        if (settings.signupEnabled !== undefined) {
            revalidatePath('/signup');
            revalidatePath('/');
        }
        if (settings.siteName !== undefined || settings.footerText !== undefined) {
            revalidatePath('/');
        }
        if (Object.keys(settings).some(k => k.startsWith('color'))) {
            revalidatePath('/', 'layout');
        }
        if (settings.numberList !== undefined) {
            revalidatePath('/dashboard/number-list');
        }

        return { success: true };
    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function updateAdminCredentials(values: any) {
    const adminCredentialsSchema = z.object({
      currentPassword: z.string().min(1, { message: "Current password is required." }),
      newEmail: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
      newPassword: z.string().min(8, { message: 'New password must be at least 8 characters.'}).optional().or(z.literal('')),
    }).refine(data => data.newEmail || data.newPassword, {
      message: "You must provide either a new email or a new password.",
      path: ["newEmail"],
    });

    try {
        const validation = adminCredentialsSchema.safeParse(values);
        if (!validation.success) {
            return { error: validation.error.errors.map(e => e.message).join(' ') };
        }

        const user = await getCurrentUser();
        if (!user || !user.isAdmin) {
            throw new Error('Unauthorized: Admin access required.');
        }
        
        await connectDB();
        const adminUser = await User.findById(user.id);
        if (!adminUser || !adminUser.password) {
             return { error: 'Admin account not found or has no password set.' };
        }

        const isPasswordValid = await bcrypt.compare(values.currentPassword, adminUser.password);
        if (!isPasswordValid) {
            return { error: 'The current password you entered is incorrect.' };
        }

        const updates: { email?: string; password?: string } = {};

        if (values.newEmail && values.newEmail !== adminUser.email) {
            const existingUser = await User.findOne({ email: values.newEmail });
            if (existingUser) {
                return { error: 'This email address is already in use.' };
            }
            updates.email = values.newEmail;
        }

        if (values.newPassword) {
            updates.password = await bcrypt.hash(values.newPassword, 10);
        }

        await User.findByIdAndUpdate(user.id, updates);
        
        if (updates.email) {
            const token = jwt.sign(
              { userId: adminUser._id, isAdmin: adminUser.isAdmin, status: adminUser.status },
              process.env.JWT_SECRET!,
              { expiresIn: '1d' }
            );
            setAuthCookie(token);
        }

        return { success: true };

    } catch (error) {
        return { error: (error as Error).message };
    }
}

    