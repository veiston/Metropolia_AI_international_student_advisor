"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface ThemeTokens {
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
}

interface ThemeContextValue {
    darkMode: boolean;
    toggleDarkMode: () => void;
    theme: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const value = useMemo<ThemeContextValue>(() => {
        let theme: ThemeTokens;

        if (darkMode) {
            theme = {
                page: 'bg-slate-900 text-slate-100',
                header: 'bg-slate-900/80 shadow-lg border border-slate-700',
                container: 'bg-slate-900/70 border border-slate-700',
                divider: 'border-slate-700',
                panel: 'bg-slate-900/60 border-slate-700',
                card: 'bg-slate-800/60 border border-slate-700',
                bubbleAssistant: 'bg-slate-800 text-slate-100',
                bubbleUser: 'bg-orange-600 text-white',
                input: 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400',
                subtleText: 'text-slate-400',
                badge: 'border-slate-600 bg-slate-800/50 text-slate-300',
                headingText: 'text-slate-100 font-bold',
                bodyText: 'text-slate-200',
                linkCard: 'border border-slate-700 bg-slate-900/40 hover:bg-slate-900/60',
                linkCardTitle: 'text-slate-100',
                linkCardMeta: 'text-slate-400',
                progressTrack: 'bg-slate-700',
            };
        } else {
            theme = {
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
                badge: 'border-gray-300 bg-gray-100 text-gray-700',
                headingText: 'text-gray-900 font-bold',
                bodyText: 'text-gray-600',
                linkCard: 'border border-gray-200 bg-white hover:shadow-md',
                linkCardTitle: 'text-gray-800',
                linkCardMeta: 'text-gray-500',
                progressTrack: 'bg-gray-200',
            };
        }

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
    if (!ctx) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return ctx;
}
