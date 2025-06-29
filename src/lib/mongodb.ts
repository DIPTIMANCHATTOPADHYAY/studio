

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Setting } from './models';
import { allColorKeys } from './types';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error(
        'Please define the MONGODB_URI environment variable inside .env'
    );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

const defaultSettings: { [key: string]: any } = {
    apiKey: 'oKREnlZLQeSs_ntZ2TAV6A',
    proxySettings: { ip: '', port: '', username: '', password: '' },
    siteName: 'SMS Inspector 2.0',
    emailChangeEnabled: true,
    signupEnabled: true,
    footerText: '© {YEAR} {SITENAME}. All rights reserved.',
    numberList: [],
    errorMappings: [],
    // Theme Colors
    colorPrimary: '217.2 91.2% 59.8%',
    colorPrimaryForeground: '210 20% 98%',
    colorBackground: '0 0% 100%',
    colorForeground: '224 71.4% 4.1%',
    colorCard: '0 0% 100%',
    colorCardForeground: '224 71.4% 4.1%',
    colorPopover: '0 0% 100%',
    colorPopoverForeground: '224 71.4% 4.1%',
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

async function seedDatabase() {
    try {
        // Seed Admin User
        const adminEmail = 'admin@example.com';
        const adminExists = await User.findOne({ email: adminEmail });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin', 10);
            await User.create({
                name: 'Admin',
                email: adminEmail,
                password: hashedPassword,
                isAdmin: true,
                status: 'active',
            });
            console.log('Default admin user created.');
        }
        
        // Seed all settings from defaultSettings object
        for (const key in defaultSettings) {
            const settingExists = await Setting.findOne({ key });
            if (!settingExists) {
                await Setting.create({ key, value: defaultSettings[key] });
                console.log(`Default setting for '${key}' has been set.`);
            }
        }
    } catch (error) {
        console.error('Error during database seeding:', error);
    }
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI!, opts).then(async (mongoose) => {
            await seedDatabase();
            return mongoose;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

export default connectDB;
