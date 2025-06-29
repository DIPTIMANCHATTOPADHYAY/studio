
import { z } from 'zod';

export interface ExtractedInfo {
  confirmationCode?: string;
  link?: string;
}

export interface SmsRecord {
  dateTime: string;
  senderId: string;
  phone: string;
  mccMnc: string;
  destination: string;
  range: string;
  rate: number | string;
  currency: string;
  message: string;
  extractedInfo: ExtractedInfo;
}

const filterFormSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  senderId: z.string().optional(),
  phone: z.string().optional(),
});

export type FilterFormValues = z.infer<typeof filterFormSchema>;

export interface UserProfile {
  id: string;
  email?: string | null;
  name?: string | null;
  photoURL?: string | null;
  status?: 'active' | 'blocked';
  isAdmin?: boolean;
  privateNumberList?: string[];
}

export interface ProxySettings {
  ip?: string;
  port?: string;
  username?: string;
  password?: string;
}

export const allColorKeys = [
  'colorPrimary', 'colorPrimaryForeground', 'colorBackground', 'colorForeground',
  'colorCard', 'colorCardForeground', 'colorPopover', 'colorPopoverForeground',
  'colorSecondary', 'colorSecondaryForeground', 'colorMuted', 'colorMutedForeground',
  'colorAccent', 'colorAccentForeground', 'colorDestructive', 'colorDestructiveForeground',
  'colorBorder', 'colorInput', 'colorRing', 'colorSidebarBackground', 'colorSidebarForeground',
  'colorSidebarAccent', 'colorSidebarAccentForeground', 'colorSidebarBorder'
] as const;

type ColorKeysTuple = typeof allColorKeys;
type ColorKey = ColorKeysTuple[number];

export type ColorSettings = {
  [K in ColorKey]?: string;
}

export interface AdminSettings extends ColorSettings {
  apiKey: string;
  proxySettings: ProxySettings;
  signupEnabled: boolean;
  siteName: string;
  footerText: string;
  emailChangeEnabled: boolean;
  numberList: string[];
  errorMappings: { reasonCode: string, customMessage: string }[];
}

export interface PublicSettings extends ColorSettings {
    siteName: string;
    signupEnabled: boolean;
    emailChangeEnabled: boolean;
    footerText: string;
    [key: string]: any; // Allow for dynamic properties
}

export interface AccessListRecord {
  price: string;
  accessOrigin: string;
  accessDestination: string;
  testNumber: string;
  rate: string;
  currency: string;
  comment: string;
  message: string;
  limitHour: string;
  limitDay: string;
  datetime: string;
}

const accessListFilterFormSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  message: z.string().optional(),
});

export type AccessListFilterFormValues = z.infer<typeof accessListFilterFormSchema>;
