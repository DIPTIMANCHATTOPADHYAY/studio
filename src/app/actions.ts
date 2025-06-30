
'use server';

import { z } from 'zod';
import { format, differenceInDays } from 'date-fns';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import { User, Setting } from '@/lib/models';
import type { FilterFormValues, SmsRecord, UserProfile, ProxySettings, ExtractedInfo, AdminSettings, PublicSettings, AccessListFilterFormValues, AccessListRecord } from '@/lib/types';
import { allColorKeys } from '@/lib/types';
import { redirect } from 'next/navigation';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { revalidatePath } from 'next/cache';

const filterSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  senderId: z.string().optional(),
  phone: z.string().optional(),
}).superRefine(({ startDate, endDate }, ctx) => {
    if (endDate < startDate) {
        ctx.addIssue({
            code: 'custom',
            message: 'End date must be after start date.',
            path: ['endDate'],
        });
        return;
    }
    if (differenceInDays(endDate, startDate) > 1) {
        ctx.addIssue({
            code: 'custom',
            message: 'The date range can be a maximum of two days.',
            path: ['endDate'],
        });
    }
});

async function getApiKey(): Promise<string> {
  await connectDB();
  const apiKeySetting = await Setting.findOne({ key: 'apiKey' });
  return apiKeySetting?.value ?? '';
}

async function getProxyAgent(): Promise<HttpsProxyAgent<string> | undefined> {
    await connectDB();
    const proxySetting = await Setting.findOne({ key: 'proxySettings' });
    if (!proxySetting || !proxySetting.value || !proxySetting.value.ip || !proxySetting.value.port) {
        return undefined;
    }
    const proxy = proxySetting.value as ProxySettings;
    const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    const proxyUrl = `http://${auth}${proxy.ip}:${proxy.port}`;
    return new HttpsProxyAgent(proxyUrl);
}

async function getErrorMappings(): Promise<Record<string, string>> {
    try {
        await connectDB();
        const mappingsSetting = await Setting.findOne({ key: 'errorMappings' });
        if (!mappingsSetting || !Array.isArray(mappingsSetting.value)) {
            return {};
        }
        return mappingsSetting.value.reduce((acc, mapping) => {
            if (mapping.reasonCode && mapping.customMessage) {
                acc[mapping.reasonCode] = mapping.customMessage;
            }
            return acc;
        }, {});
    } catch (error) {
        console.error('Error fetching error mappings:', error);
        return {};
    }
}

async function handleApiError(response: Response): Promise<{ error: string }> {
    const errorText = await response.text();
    try {
        const jsonError = JSON.parse(errorText);
        if (jsonError.error) {
            const reasonCode = jsonError.error.reason_code;
            if (reasonCode) {
                const errorMap = await getErrorMappings();
                const customMessage = errorMap[reasonCode];
                if (customMessage) {
                    return { error: customMessage };
                }
            }
            return { error: `API Error: ${jsonError.error.message}` };
        }
    } catch (e) {
        // Ignore parsing error, return raw text
    }
    return { error: `API Error: ${response.status} ${response.statusText}. ${errorText}` };
}

// A robust CSV parser that handles newlines and semicolons inside message content.
function parseCsvWithQuotes(input: string): string[][] {
    const rows: string[][] = [];
    let inQuotes = false;
    let row: string[] = [];
    let field = '';
    const text = input.trim();

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    field += '"';
                    i++; // Skip the next quote (escaped quote)
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ';') {
                row.push(field);
                field = '';
            } else if (char === '\n' || char === '\r') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
                if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                    i++; // Handle CRLF
                }
            } else {
                field += char;
            }
        }
    }

    // Add the last field and row if the file doesn't end with a newline
    if (field || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter(r => r.length > 1 || (r.length === 1 && r[0]));
};

export async function fetchSmsData(
  filter: FilterFormValues
): Promise<{ data?: SmsRecord[]; error?: string }> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return { error: 'API key is not configured. Please set it in the admin panel.' };
  }
  
  const validation = filterSchema.safeParse(filter);
  if (!validation.success) {
    return { error: validation.error.errors.map((e) => e.message).join(', ') };
  }
  
  const agent = await getProxyAgent();

  const API_URL = 'https://api.premiumy.net/v1.0/csv';
  const body = {
    id: null,
    jsonrpc: '2.0',
    method: 'sms.mdr_full:get_list',
    params: {
      filter: {
        start_date: format(filter.startDate!, 'yyyy-MM-dd HH:mm:ss'),
        end_date: format(filter.endDate!, 'yyyy-MM-dd HH:mm:ss'),
        senderid: filter.senderId,
        phone: filter.phone,
      },
      page: 1,
      per_page: 100,
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(body),
      agent,
    });

    if (!response.ok) {
        return handleApiError(response);
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim() === '') {
        return { data: [] };
    }
    
    if (csvText.trim().startsWith('{')) {
        return handleApiError(response);
    }
    
    const allRows = parseCsvWithQuotes(csvText);

    if (allRows.length < 2) {
      return { data: [] };
    }

    const headers = allRows[0].map(h => h.trim().toLowerCase());
    const dataRows = allRows.slice(1);
    const records: SmsRecord[] = [];

    const columnMap: { [key in keyof Omit<SmsRecord, 'extractedInfo'>]?: number } = {
        dateTime: headers.indexOf('datetime'),
        senderId: headers.indexOf('senderid'),
        phone: headers.indexOf('b-number'),
        mccMnc: headers.indexOf('mcc/mnc'),
        destination: headers.indexOf('destination'),
        rate: headers.indexOf('rate'),
        currency: headers.indexOf('currency'),
        message: headers.indexOf('message'),
    };
    
    if (columnMap.dateTime === -1 || columnMap.message === -1) {
        return { error: "CSV response is missing required columns ('datetime', 'message')." };
    }
    
    for (const parts of dataRows) {
        if (parts.length <= columnMap.message!) {
            continue; // Skip malformed rows
        }

        const message = parts[columnMap.message!];
        const extractedInfo = extractInfoWithoutAI(message);

        records.push({
            dateTime: parts[columnMap.dateTime!],
            senderId: parts[columnMap.senderId!],
            phone: parts[columnMap.phone!],
            mccMnc: parts[columnMap.mccMnc!],
            destination: parts[columnMap.destination!],
            rate: parts[columnMap.rate!],
            currency: parts[columnMap.currency!],
            message: message,
            extractedInfo,
        });
    }
    
    return { data: records };
  } catch (err) {
    const error = err as Error;
    console.error('Failed to fetch SMS data:', error);
    return { error: error.message || 'An unknown error occurred.' };
  }
}

function extractInfoWithoutAI(message: string): ExtractedInfo {
    // Regex for confirmation codes: looks for 4-8 consecutive digits, or a 123-456 pattern.
    const codeRegex = /\b(\d{4,8}|\d{3}-\d{3})\b/g;
    const codes = message.match(codeRegex);
    let confirmationCode = codes ? codes[0] : undefined;

    if (confirmationCode) {
        // Remove any hyphens from the found code.
        confirmationCode = confirmationCode.replace(/-/g, '');
    }

    // Regex for links: finds URLs starting with http or https.
    const linkRegex = /(https?:\/\/[^\s"']+)/g;
    const links = message.match(linkRegex);
    const link = links ? links[0] : undefined;
    
    return { confirmationCode, link };
}

export async function fetchAccessListData(
  formValues: AccessListFilterFormValues
): Promise<{ data?: AccessListRecord[]; error?: string }> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return { error: 'API key is not configured. Please set it in the admin panel.' };
  }
  
  const agent = await getProxyAgent();

  const API_URL = 'https://api.premiumy.net/v1.0/csv';
  const body = {
    id: null,
    jsonrpc: '2.0',
    method: 'sms.access_list__get_list:account_price',
    params: {
      filter: {
        cur_key: 1,
        destination: formValues.destination,
        message: formValues.message,
        origin: formValues.origin,
        sp_key_list: null
      },
      page: 1,
      per_page: 100,
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(body),
      agent,
    });

    if (!response.ok) {
       return handleApiError(response);
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim() === '') {
        return { data: [] };
    }
    
    if (csvText.trim().startsWith('{')) {
        return handleApiError(response);
    }

    const allRows = parseCsvWithQuotes(csvText);

    if (allRows.length < 2) {
      return { data: [] };
    }

    const headers = allRows[0].map(h => h.trim().toLowerCase());
    const dataRows = allRows.slice(1);
    const records: AccessListRecord[] = [];

    const columnMap = {
        price: headers.indexOf('price'),
        accessOrigin: headers.indexOf('access origin'),
        accessDestination: headers.indexOf('access destination'),
        testNumber: headers.indexOf('test number'),
        rate: headers.indexOf('rate'),
        currency: headers.indexOf('currency'),
        comment: headers.indexOf('comment'),
        message: headers.indexOf('message'),
        limitHour: headers.indexOf('limit hour'),
        limitDay: headers.indexOf('limit day'),
        datetime: headers.indexOf('datetime'),
    };
    
    if (columnMap.accessOrigin === -1) {
        return { error: "CSV response is missing required column ('access origin')." };
    }
    
    for (const parts of dataRows) {
        records.push({
            price: parts[columnMap.price!],
            accessOrigin: parts[columnMap.accessOrigin!],
            accessDestination: parts[columnMap.accessDestination!],
            testNumber: parts[columnMap.testNumber!],
            rate: parts[columnMap.rate!],
            currency: parts[columnMap.currency!],
            comment: parts[columnMap.comment!],
            message: parts[columnMap.message!],
            limitHour: parts[columnMap.limitHour!],
            limitDay: parts[columnMap.limitDay!],
            datetime: parts[columnMap.datetime!],
        });
    }
    
    return { data: records };
  } catch (err) {
    const error = err as Error;
    console.error('Failed to fetch access list data:', error);
    return { error: error.message || 'An unknown error occurred.' };
  }
}

// --- Auth Actions ---
function isSecureEnvironment() {
    return process.env.NODE_ENV === 'production' && process.env.FORCE_HTTP !== 'true';
}

function setAuthCookie(token: string) {
    cookies().set('token', token, {
      httpOnly: true,
      secure: isSecureEnvironment(),
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
}

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

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

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
            status: 'active',
            isAdmin: false,
        });

        return { success: true };
    } catch (error) {
        console.error("Signup error:", error);
        return { error: 'An unexpected error occurred.' };
    }
}


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
    
    setAuthCookie(token);

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { error: 'An unexpected error occurred.' };
  }
}

export async function logout() {
    cookies().delete('token');
    cookies().delete('admin_session');
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


// --- User Profile Actions ---
const userProfileSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
});

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


// --- Public Site Settings ---
async function getAllSettingsAsMap(): Promise<{ [key: string]: any }> {
    await connectDB();
    const settings = await Setting.find({}).lean();
    const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {} as { [key: string]: any });
    return settingsMap;
}


export async function getPublicSettings(): Promise<PublicSettings> {
    try {
        const settingsMap = await getAllSettingsAsMap();

        return {
            siteName: settingsMap.siteName ?? 'SMS Inspector 2.0',
            signupEnabled: settingsMap.signupEnabled === true,
            emailChangeEnabled: settingsMap.emailChangeEnabled !== false,
            footerText: settingsMap.footerText ?? '© {YEAR} {SITENAME}. All rights reserved.',
            colorPrimary: settingsMap.colorPrimary ?? '217.2 91.2% 59.8%',
            colorBackground: settingsMap.colorBackground ?? '0 0% 100%',
            colorForeground: settingsMap.colorForeground ?? '224 71.4% 4.1%',
            colorCard: settingsMap.colorCard ?? '0 0% 100%',
            colorCardForeground: settingsMap.colorCardForeground ?? '224 71.4% 4.1%',
            colorPopover: settingsMap.colorPopover ?? '0 0% 100%',
            colorPopoverForeground: settingsMap.colorPopoverForeground ?? '224 71.4% 4.1%',
            colorPrimaryForeground: settingsMap.colorPrimaryForeground ?? '210 20% 98%',
            colorSecondary: settingsMap.colorSecondary ?? '215 27.9% 95.1%',
            colorSecondaryForeground: settingsMap.colorSecondaryForeground ?? '224 71.4% 4.1%',
            colorMuted: settingsMap.colorMuted ?? '215 27.9% 95.1%',
            colorMutedForeground: settingsMap.colorMutedForeground ?? '215 20.2% 65.1%',
            colorAccent: settingsMap.colorAccent ?? '215 27.9% 95.1%',
            colorAccentForeground: settingsMap.colorAccentForeground ?? '224 71.4% 4.1%',
            colorDestructive: settingsMap.colorDestructive ?? '0 84.2% 60.2%',
            colorDestructiveForeground: settingsMap.colorDestructiveForeground ?? '210 20% 98%',
            colorBorder: settingsMap.colorBorder ?? '215 20.2% 90.1%',
            colorInput: settingsMap.colorInput ?? '215 20.2% 90.1%',
            colorRing: settingsMap.colorRing ?? '217.2 91.2% 59.8%',
            colorSidebarBackground: settingsMap.colorSidebarBackground ?? '217.2 91.2% 59.8%',
            colorSidebarForeground: settingsMap.colorSidebarForeground ?? '210 20% 98%',
            colorSidebarAccent: settingsMap.colorSidebarAccent ?? '222.1 71.1% 50.4%',
            colorSidebarAccentForeground: settingsMap.colorSidebarAccentForeground ?? '210 20% 98%',
            colorSidebarBorder: settingsMap.colorSidebarBorder ?? '222.1 71.1% 50.4%',
        };
    } catch (error) {
        console.error("Error fetching public settings:", error);
        // Return default values on error
        const defaults = (await getAdminSettings()).defaults as PublicSettings;
        return defaults;
    }
}


// --- Admin Actions ---
async function ensureAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    throw new Error('Unauthorized: Admin access required.');
  }
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
            siteName: settingsMap.siteName ?? 'SMS Inspector 2.0',
            footerText: settingsMap.footerText ?? '© {YEAR} {SITENAME}. All rights reserved.',
            emailChangeEnabled: settingsMap.emailChangeEnabled !== false,
            numberList: settingsMap.numberList ?? [],
            errorMappings: settingsMap.errorMappings ?? [],
            
            // Color settings with defaults
            colorPrimary: settingsMap.colorPrimary ?? '217.2 91.2% 59.8%',
            colorPrimaryForeground: settingsMap.colorPrimaryForeground ?? '210 20% 98%',
            colorBackground: settingsMap.colorBackground ?? '0 0% 100%',
            colorForeground: settingsMap.colorForeground ?? '224 71.4% 4.1%',
            colorCard: settingsMap.colorCard ?? '0 0% 100%',
            colorCardForeground: settingsMap.colorCardForeground ?? '224 71.4% 4.1%',
            colorPopover: settingsMap.colorPopover ?? '0 0% 100%',
            colorPopoverForeground: settingsMap.colorPopoverForeground ?? '224 71.4% 4.1%',
            colorSecondary: settingsMap.colorSecondary ?? '215 27.9% 95.1%',
            colorSecondaryForeground: settingsMap.colorSecondaryForeground ?? '224 71.4% 4.1%',
            colorMuted: settingsMap.colorMuted ?? '215 27.9% 95.1%',
            colorMutedForeground: settingsMap.colorMutedForeground ?? '215 20.2% 65.1%',
            colorAccent: settingsMap.colorAccent ?? '215 27.9% 95.1%',
            colorAccentForeground: settingsMap.colorAccentForeground ?? '224 71.4% 4.1%',
            colorDestructive: settingsMap.colorDestructive ?? '0 84.2% 60.2%',
            colorDestructiveForeground: settingsMap.colorDestructiveForeground ?? '210 20% 98%',
            colorBorder: settingsMap.colorBorder ?? '215 20.2% 90.1%',
            colorInput: settingsMap.colorInput ?? '215 20.2% 90.1%',
            colorRing: settingsMap.colorRing ?? '217.2 91.2% 59.8%',
            colorSidebarBackground: settingsMap.colorSidebarBackground ?? '217.2 91.2% 59.8%',
            colorSidebarForeground: settingsMap.colorSidebarForeground ?? '210 20% 98%',
            colorSidebarAccent: settingsMap.colorSidebarAccent ?? '222.1 71.1% 50.4%',
            colorSidebarAccentForeground: settingsMap.colorSidebarAccentForeground ?? '210 20% 98%',
            colorSidebarBorder: settingsMap.colorSidebarBorder ?? '222.1 71.1% 50.4%',
        };

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


        return { success: true };
    } catch (error) {
        return { error: (error as Error).message };
    }
}

export async function getAllUsers(): Promise<{ users?: UserProfile[], error?: string }> {
    try {
        await ensureAdmin();
        await connectDB();
        const users = await User.find({}).select('-password');
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

// --- Admin Auth Actions ---
const adminLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function adminLogin(values: z.infer<typeof adminLoginSchema>) {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
        return { error: 'Admin credentials are not configured on the server. Please check the environment variables.' };
    }

    if (values.username === adminUsername && values.password === adminPassword) {
        cookies().set('admin_session', 'true', {
            httpOnly: true,
            secure: isSecureEnvironment(),
            sameSite: 'strict',
            maxAge: 60 * 60, // 1 hour
            path: '/',
        });
        return { success: true };
    }
    return { error: 'Invalid admin credentials.' };
}

export async function adminLogout() {
  cookies().delete('admin_session');
  redirect('/admin');
}

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


// --- User-facing number management ---
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

// --- New Admin User Management Functions ---
const adminCreateUserSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.'}),
  email: z.string().email(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.'}),
});

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

const adminResetPasswordSchema = z.object({
  userId: z.string(),
  password: z.string().min(8, { message: 'New password must be at least 8 characters.'}),
});

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
