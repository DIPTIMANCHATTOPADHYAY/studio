'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { getAdminSettings, updateAdminSettings } from '@/app/actions';
import { hslToHex, hexToHsl } from '@/lib/utils';
import { allColorKeys } from '@/lib/types';

type ColorSettings = { [key: string]: string };

const colorMetadata = [
    {
        group: 'Main Theme',
        colors: [
            { key: 'colorPrimary', label: 'Primary', description: 'Main interactive elements, buttons, links.' },
            { key: 'colorPrimaryForeground', label: 'Primary Foreground', description: 'Text on primary-colored elements.' },
            { key: 'colorDestructive', label: 'Destructive', description: 'Buttons and actions that are destructive (e.g., delete).' },
            { key: 'colorDestructiveForeground', label: 'Destructive Foreground', description: 'Text on destructive elements.' },
            { key: 'colorRing', label: 'Ring', description: 'Focus rings for accessibility.' },
        ]
    },
    {
        group: 'App & Card Colors',
        colors: [
            { key: 'colorBackground', label: 'Background', description: 'The main background color of the app.' },
            { key: 'colorForeground', label: 'Foreground', description: 'The default text color.' },
            { key: 'colorCard', label: 'Card', description: 'Background color for cards and popovers.' },
            { key: 'colorCardForeground', label: 'Card Foreground', description: 'Text color inside cards.' },
        ]
    },
    {
        group: 'Secondary & Muted Colors',
        colors: [
            { key: 'colorSecondary', label: 'Secondary', description: 'Secondary backgrounds or elements.' },
            { key: 'colorSecondaryForeground', label: 'Secondary Foreground', description: 'Text on secondary elements.' },
            { key: 'colorMuted', label: 'Muted', description: 'Muted backgrounds for subtle emphasis.' },
            { key: 'colorMutedForeground', label: 'Muted Foreground', description: 'Muted text for less important information.' },
        ]
    },
    {
        group: 'Accent & Border Colors',
        colors: [
            { key: 'colorAccent', label: 'Accent', description: 'Accent color for hover states and active elements.' },
            { key: 'colorAccentForeground', label: 'Accent Foreground', description: 'Text on accent-colored elements.' },
            { key: 'colorBorder', label: 'Border', description: 'Color for borders and separators.' },
            { key: 'colorInput', label: 'Input', description: 'Border color for input fields.' },
        ]
    },
    {
        group: 'Sidebar Colors',
        colors: [
            { key: 'colorSidebarBackground', label: 'Sidebar Background', description: 'Background of the main navigation sidebar.' },
            { key: 'colorSidebarForeground', label: 'Sidebar Foreground', description: 'Text and icon color in the sidebar.' },
            { key: 'colorSidebarAccent', label: 'Sidebar Accent', description: 'Hover and active state color in the sidebar.' },
            { key: 'colorSidebarAccentForeground', label: 'Sidebar Accent Foreground', description: 'Text color on sidebar accents.' },
            { key: 'colorSidebarBorder', label: 'Sidebar Border', description: 'Border color for the sidebar.' },
        ]
    }
];

const ColorSettingInput = ({
    label,
    description,
    hslColor,
    onColorChange,
    isLoading
}: {
    label: string;
    description: string;
    hslColor: string;
    onColorChange: (newHslColor: string) => void;
    isLoading: boolean;
}) => {
    const [hexColor, setHexColor] = useState('#000000');

    useEffect(() => {
        setHexColor(hslToHex(hslColor));
    }, [hslColor]);

    const handleHexColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHex = e.target.value;
        setHexColor(newHex);
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newHex)) {
            onColorChange(hexToHsl(newHex));
        }
    };

    const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHex = e.target.value;
        setHexColor(newHex);
        onColorChange(hexToHsl(newHex));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center border-b py-4">
            <div className="space-y-1">
                <Label>{label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2 justify-start md:justify-end">
                <div className="relative h-10 w-10 shrink-0">
                    <Input
                        type="color"
                        value={hexColor}
                        onChange={handleColorPickerChange}
                        disabled={isLoading}
                        className="absolute inset-0 h-full w-full cursor-pointer p-0 opacity-0"
                    />
                    <div
                        className="h-10 w-10 rounded-md border"
                        style={{ backgroundColor: hexColor }}
                        aria-hidden="true"
                    />
                </div>
                <Input
                    value={hexColor}
                    onChange={handleHexColorChange}
                    disabled={isLoading}
                    className="w-28 font-mono"
                />
            </div>
        </div>
    );
};

export function AppearanceTab() {
    const { toast } = useToast();
    const [siteName, setSiteName] = useState('');
    const [footerText, setFooterText] = useState('');
    const [colors, setColors] = useState<ColorSettings>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadSettings() {
            setIsLoading(true);
            const result = await getAdminSettings();
            if (result.error) {
                toast({ variant: 'destructive', title: 'Error fetching settings', description: result.error });
            } else {
                setSiteName(result.siteName || '');
                setFooterText(result.footerText || '');
                const loadedColors: ColorSettings = {};
                for (const key of allColorKeys) {
                    if (result[key]) {
                        loadedColors[key] = result[key];
                    }
                }
                setColors(loadedColors);
            }
            setIsLoading(false);
        }
        loadSettings();
    }, [toast]);

    const handleColorChange = (key: string, value: string) => {
        setColors(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        const settingsToUpdate = { siteName, footerText, ...colors };
        
        const result = await updateAdminSettings(settingsToUpdate);
        
        if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to save settings', description: result.error });
        } else {
            toast({ title: 'Appearance Settings Saved', description: 'Your changes will be applied across the site.' });
            // Full page reload to ensure all styles are correctly applied
            window.location.reload();
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Branding &amp; Footer</CardTitle>
                    <CardDescription>Customize the name and footer text of your application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="site-name">Site Name</Label>
                        <Input
                            id="site-name"
                            placeholder="Your App Name"
                            value={siteName}
                            onChange={(e) => setSiteName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="footer-text">Footer Text</Label>
                        <Input
                            id="footer-text"
                            placeholder="e.g., © {YEAR} {SITENAME}. All rights reserved."
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            disabled={isLoading}
                        />
                        <p className="text-sm text-muted-foreground">
                            You can use placeholders: <code>{'{YEAR}'}</code> for the current year and <code>{'{SITENAME}'}</code> for the site name.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {colorMetadata.map(group => (
                 <Card key={group.group}>
                    <CardHeader>
                        <CardTitle>{group.group}</CardTitle>
                        <CardDescription>Customize the colors for {group.group.toLowerCase()}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {group.colors.map(color => (
                             <ColorSettingInput
                                key={color.key}
                                label={color.label}
                                description={color.description}
                                hslColor={colors[color.key] || ''}
                                onColorChange={(newHsl) => handleColorChange(color.key, newHsl)}
                                isLoading={isLoading}
                            />
                        ))}
                    </CardContent>
                 </Card>
            ))}


            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} size="lg">
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Save Appearance Settings
                </Button>
            </div>
        </div>
    );
}
