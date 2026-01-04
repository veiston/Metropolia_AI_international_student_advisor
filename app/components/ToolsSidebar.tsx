"use client";

import React, { useRef } from 'react';
import UploadProgress from './UploadProgress';
import { useTheme } from './ThemeProvider';
import { ChecklistPayload, ChecklistItem } from '../types';

interface Props {
    file: File | null;
    onFileSelected: (file: File | null) => void;
    onSubmit: () => void;
    loading: boolean;
    checklist: ChecklistPayload | null;
    uploadProgress: number;
    hiddenOnMobile?: boolean;
}

export default function ToolsSidebar({
    file,
    onFileSelected,
    onSubmit,
    loading,
    checklist,
    uploadProgress,
    hiddenOnMobile,
}: Props) {
    const { theme, darkMode } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelected(e.target.files[0]);
        }
    };

    const checklistItems = checklist?.checklist || [];

    return (
        <div
            className={`${theme.panel} w-full md:w-96 p-4 sm:p-6 border-l overflow-y-auto ${hiddenOnMobile ? 'hidden md:block' : ''} md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-3rem)]`}
        >
            <h2 className={`font-bold text-xl mb-4 flex items-center gap-2 ${theme.headingText}`}>
                <span role="img" aria-label="tools">🛠️</span> Tools
            </h2>

            <div className={`${theme.card} p-4 rounded-xl shadow-sm mb-4`}>
                <h3 className="font-semibold mb-2 text-sm text-orange-500 flex items-center gap-1">
                    <span role="img" aria-label="document">📄</span> Document Scanner
                </h3>
                <p className={`text-xs mb-3 ${theme.bodyText}`}>Upload admission letter or rental contract for analysis.</p>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        className="flex-1 cursor-pointer bg-orange-500 hover:bg-orange-800 text-white text-sm py-2 px-4 rounded-lg transition-colors text-center"
                    >
                        {file ? file.name : 'Browse files'}
                    </label>
                </div>
                {file && (
                    <button
                        onClick={onSubmit}
                        disabled={loading}
                        className="mt-2 w-full bg-orange-500 text-white text-sm py-2 rounded-lg hover:bg-orange-800 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Analyze {file.name}
                    </button>
                )}
                <UploadProgress progress={uploadProgress} />
            </div>

            {checklist ? (
                <div className={`${theme.card} p-4 rounded-xl shadow-sm ${darkMode ? 'border-orange-400/30' : 'border-orange-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-sm text-orange-500 flex items-center gap-1">
                            <span role="img" aria-label="checklist">✅</span> Generated Checklist
                        </h3>
                    </div>

                    {checklist.summary && <p className={`text-xs mb-3 italic ${theme.bodyText}`}>{checklist.summary}</p>}

                    <div className="space-y-2">
                        {checklistItems.map((item: ChecklistItem, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                                <input type="checkbox" className="mt-1" />
                                <div
                                    className={`${theme.panel} w-full md:w-96 p-4 sm:p-6 border-l overflow-y-auto ${hiddenOnMobile ? 'hidden md:block' : ''} md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-3rem)]`}
                                >
                                    {item.urgency && (
                                        <span className="text-[10px] text-red-500 font-bold uppercase">{item.urgency}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {checklist.risks && (
                        <div className={`mt-4 p-2 rounded border ${darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-100'}`}>
                            <h4 className={`text-xs font-bold mb-1 ${darkMode ? 'text-red-200' : 'text-red-700'}`}>Risks / Missing Info</h4>
                            <p className={`text-xs ${darkMode ? 'text-red-200/90' : 'text-red-600'}`}>{checklist.risks}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className={`text-center text-sm mt-10 ${theme.subtleText}`}>Upload a document to see a checklist here.</div>
            )}
        </div>
    );
}
