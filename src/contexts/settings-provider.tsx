'use client'

import { createContext, useContext, ReactNode } from "react"

// Define the shape of your settings
interface SiteSettings {
    siteName: string;
}

// Create the context with a default value
const SettingsContext = createContext<SiteSettings | undefined>(undefined);

// Create a provider component
export const SettingsProvider = ({ children, value }: { children: ReactNode, value: SiteSettings }) => {
    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

// Create a custom hook to use the settings context
export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
