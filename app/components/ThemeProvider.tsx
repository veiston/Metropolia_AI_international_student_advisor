"use client";

import React, { createContext, useContext, useMemo, useState } from 'react';

interface ThemeContextValue {
    darkMode: boolean;
    toggleDarkMode: () => void;
    theme: Record<string, string>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const lightTheme = {
    page: 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900',
    header: 'bg-white shadow-md border border-gray-200',
    container: 'bg-white',
    divider: 'border-gray-200',
    panel: 'bg-gray-50 border-gray-200',
    card: 'bg-white border border-gray-200',
    bubbleAssistant: 'bg-gray-100 text-gray-900',
    bubbleUser: 'bg-orange-600 text-white',
    input: 'bg-white border-gray-200 text-gray-900 placeholder-gray-500',
    subtleText: 'text-gray-500',
    badge: 'border-orange-200 bg-orange-50 text-orange-700',
    headingText: 'text-gray-800',
    bodyText: 'text-gray-600',
    linkCard: 'border border-gray-200 bg-white hover:shadow-md',
    linkCardTitle: 'text-gray-800',
    linkCardMeta: 'text-gray-500',
    progressTrack: 'bg-gray-200',
};

const darkTheme = {
    page: 'bg-slate-900 text-slate-100',
    header: 'bg-slate-900/80 shadow-lg border border-slate-700',
    container: 'bg-slate-900/70 border border-slate-700',
    divider: 'border-slate-700',
    panel: 'bg-slate-900/60 border-slate-700',
    card: 'bg-slate-800/60 border border-slate-700',
    bubbleAssistant: 'bg-slate-800 text-slate-100',
    bubbleUser: 'bg-orange-600 text-white',
    input: 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400',
    subtleText: 'text-slate-300',
    badge: 'border-orange-400/60 bg-orange-500/10 text-orange-200',
    headingText: 'text-slate-100',
    bodyText: 'text-slate-200',
    linkCard: 'border border-slate-700 bg-slate-900/40 hover:bg-slate-900/60',
    linkCardTitle: 'text-slate-100',
    linkCardMeta: 'text-slate-300',
    progressTrack: 'bg-slate-700',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState(false);

    const value = useMemo<ThemeContextValue>(
        () => ({
            darkMode,
            toggleDarkMode: () => setDarkMode((prev) => !prev),
            theme: darkMode ? darkTheme : lightTheme,
        }),
        [darkMode]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}
