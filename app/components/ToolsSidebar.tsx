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

    const scannerTitleClass = darkMode ? 'text-orange-300' : 'text-orange-700';
    const scannerCardClass = darkMode
        ? 'bg-slate-800/70 border-slate-600'
        : 'bg-white border-orange-100';
    const checklistTitleClass = darkMode ? 'text-emerald-300' : 'text-emerald-700';
    const checklistCardClass = darkMode
        ? 'bg-slate-800/70 border-emerald-500/30'
        : 'bg-white border-emerald-200';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelected(e.target.files[0]);
        }
    };

    const checklistItems = checklist?.checklist || [];

    return (
        <div
            className={`${theme.panel} w-full md:w-96 p-3 sm:p-6 border-l overflow-y-auto ${hiddenOnMobile ? 'hidden md:block' : ''} md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-3rem)]`}
        >
            <h2 className={`font-bold text-lg sm:text-xl mb-3 sm:mb-4 flex items-center gap-2 ${theme.headingText}`}>
                <span role="img" aria-label="tools">🛠️</span> Tools
            </h2>

            <div className={`${theme.card} ${scannerCardClass} p-3 sm:p-4 rounded-xl shadow-sm mb-3 sm:mb-4`}>
                <h3 className={`font-semibold mb-2 text-xs sm:text-sm flex items-center gap-1 ${scannerTitleClass}`}>
                    <span role="img" aria-label="document">📄</span> PDF Document Scanner
                </h3>
                <p className={`text-xs mb-3 ${theme.bodyText}`}>Upload a form, assignment instructions, or rental contract etc.</p>
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
                        className="flex-1 cursor-pointer bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-lg transition-colors text-center"
                    >
                        {file ? file.name : 'Browse files'}
                    </label>
                </div>
                {file && (
                    <button
                        onClick={onSubmit}
                        disabled={loading}
                        className="mt-2 w-full bg-gray-700 text-white text-xs sm:text-sm py-2 rounded-lg hover:bg-gray-800 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Analyze {file.name}
                    </button>
                )}
                <UploadProgress progress={uploadProgress} />
            </div>

            {checklist ? (
                <div className={`${theme.card} ${checklistCardClass} p-4 rounded-xl shadow-sm`}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className={`font-semibold text-sm flex items-center gap-1 ${checklistTitleClass}`}>
                            <span role="img" aria-label="checklist">✅</span> Generated Checklist
                        </h3>
                    </div>

                    {checklist.summary && <p className={`text-xs mb-3 italic ${theme.bodyText}`}>{checklist.summary}</p>}

                    <div className="space-y-2.5">
                        {checklistItems.map((item: ChecklistItem, idx: number) => (
                            <div key={idx} className={`flex items-start gap-2.5 text-sm p-2.5 rounded-lg border ${darkMode ? 'border-slate-600 bg-slate-900/40' : 'border-gray-200 bg-gray-50'}`}>
                                <input type="checkbox" className="mt-1 rounded" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className={`text-xs sm:text-sm font-semibold leading-snug ${darkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                                            {item.title || 'Action step'}
                                        </h4>
                                        {item.urgency && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap ${item.urgency.toLowerCase() === 'high'
                                                ? (darkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700')
                                                : item.urgency.toLowerCase() === 'medium'
                                                    ? (darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')
                                                    : (darkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                                }`}>
                                                {item.urgency}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs mt-1.5 leading-relaxed ${theme.bodyText}`}>
                                        {item.description || 'No details provided.'}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {checklistItems.length === 0 && (
                            <div className={`text-xs rounded-lg p-3 border ${darkMode ? 'bg-slate-900/40 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                No actionable checklist items were extracted. Try uploading a clearer document or run analysis again.
                            </div>
                        )}
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
