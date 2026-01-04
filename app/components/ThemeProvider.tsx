"use client";

import React from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

interface ThemeContextValue {
    darkMode: boolean;
    toggleDarkMode: () => void;
    theme: {
        page: string;
        header: string;
        container: string;
        divider: string;
        panel: string;
        card: string;
        bubbleAssistant: string;
        bubbleUser: string;
        input: string;
        subtleText: string;
        badge: string;
        headingText: string;
        bodyText: string;
        linkCard: string;
        linkCardTitle: string;
        linkCardMeta: string;
        progressTrack: string;
    };
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState(false);

    const value = useMemo<ThemeContextValue>(() => {
        const theme = {
            // Softer dark theme (still AA/AAA-friendly), all Tailwind tokens.
            page: darkMode
                ? 'bg-slate-900 text-slate-100'
                : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900',
            header: darkMode
                ? 'bg-slate-900/80 shadow-lg border border-slate-700'
                : 'bg-white shadow-md border border-gray-200',
            container: darkMode ? 'bg-slate-900/70 border border-slate-700' : 'bg-white',
            divider: darkMode ? 'border-slate-700' : 'border-gray-200',
            panel: darkMode
                ? 'bg-slate-900/60 border-slate-700'
                : 'bg-gray-50 border-gray-200',
            card: darkMode ? 'bg-slate-800/60 border border-slate-700' : 'bg-white border border-gray-200',
            bubbleAssistant: darkMode ? 'bg-slate-800 text-slate-100' : 'bg-gray-100 text-gray-900',
            bubbleUser: 'bg-orange-600 text-white',
            input: darkMode
                ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500',
            subtleText: darkMode ? 'text-slate-400' : 'text-gray-500',
            badge: darkMode
                ? 'border-slate-600 bg-slate-800/50 text-slate-300'
                : 'border-gray-300 bg-gray-100 text-gray-700',
            headingText: darkMode ? 'text-slate-100 font-bold' : 'text-gray-900 font-bold',
            bodyText: darkMode ? 'text-slate-200' : 'text-gray-600',
            linkCard: darkMode
                ? 'border border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
                : 'border border-gray-200 bg-white hover:shadow-md',
            linkCardTitle: darkMode ? 'text-slate-100' : 'text-gray-800',
            linkCardMeta: darkMode ? 'text-slate-400' : 'text-gray-500',
            progressTrack: darkMode ? 'bg-slate-700' : 'bg-gray-200',
        };

        return {
            darkMode,
            toggleDarkMode: () => setDarkMode((prev) => !prev),
            theme,
        };
    }, [darkMode]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}
