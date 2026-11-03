'use client';

import { ChangeEvent, useRef } from 'react';
import { ChecklistPayload, ChecklistItem } from '../types';

interface Props {
    file: File | null;
    onFileSelected: (file: File | null) => void;
    onSubmit: () => void;
    loading: boolean;
    checklist: ChecklistPayload | null;
    hiddenOnMobile?: boolean;
}

export default function ToolsSidebar({
    file,
    onFileSelected,
    onSubmit,
    loading,
    checklist,
    hiddenOnMobile,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const urgencyClass = (urgency: string) => {
        const level = urgency.toLowerCase();
        if (level === 'high') {
            return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
        }
        if (level === 'medium') {
            return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
        }
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelected(e.target.files[0]);
        }
    };

    const checklistItems = checklist?.checklist || [];

    return (
        <div
            className={`w-full md:w-96 p-2.5 sm:p-6 border-l overflow-y-auto bg-gray-50 border-gray-200 dark:bg-slate-900/60 dark:border-slate-700 ${hiddenOnMobile ? 'hidden md:block' : ''} md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-3rem)]`}
        >
            <h2 className="font-bold text-base sm:text-xl mb-2.5 sm:mb-4 flex items-center gap-1.5 sm:gap-2 text-gray-900 dark:text-slate-100">
                <span role="img" aria-label="tools">🛠️</span> Tools
            </h2>

            <div className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl shadow-sm mb-2.5 sm:mb-4 bg-white border border-orange-100 dark:bg-slate-800/70 dark:border-slate-600">
                <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-sm flex items-center gap-1 text-orange-700 dark:text-orange-300">
                    <span role="img" aria-label="document">📄</span> PDF Scanner
                </h3>
                <p className="text-sm sm:text-xs mb-2.5 sm:mb-3 text-gray-600 dark:text-slate-200">Upload forms, instructions, contracts etc.</p>
                <div className="flex gap-1.5 sm:gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        className="flex-1 cursor-pointer bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-sm py-2 sm:py-2 px-2.5 sm:px-4 rounded-md sm:rounded-lg transition-colors text-center truncate"
                        title={file?.name || 'Browse files'}
                    >
                        {file ? file.name : 'Browse files'}
                    </label>
                </div>
                {file && (
                    <button
                        onClick={onSubmit}
                        disabled={loading}
                        className="mt-2 sm:mt-2 w-full bg-gray-700 text-white text-sm sm:text-sm py-2 sm:py-2 rounded-md sm:rounded-lg hover:bg-gray-800 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Analyzing...' : 'Analyze'}
                    </button>
                )}
            </div>

            {checklist ? (
                <div className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl shadow-sm bg-white border border-emerald-200 dark:bg-slate-800/70 dark:border-emerald-500/30">
                    <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                        <h3 className="font-semibold text-sm sm:text-sm flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                            <span role="img" aria-label="checklist">✅</span> Checklist
                        </h3>
                    </div>

                    {checklist.summary && <p className="text-sm sm:text-xs mb-2.5 sm:mb-3 italic text-gray-600 dark:text-slate-200">{checklist.summary}</p>}

                    <div className="space-y-1.5 sm:space-y-2.5">
                        {checklistItems.map((item: ChecklistItem, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 sm:gap-2.5 text-sm sm:text-sm p-2 sm:p-2.5 rounded-md sm:rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-600 dark:bg-slate-900/40">
                                <input type="checkbox" className="mt-1 rounded w-4 h-4" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-1 sm:gap-2">
                                        <h4 className="text-sm sm:text-sm font-semibold leading-snug text-gray-900 dark:text-slate-100">
                                            {item.title || 'Action step'}
                                        </h4>
                                        {item.urgency && (
                                            <span className={`text-xs sm:text-[11px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap ${urgencyClass(item.urgency)}`}>
                                                {item.urgency}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm sm:text-xs mt-1 sm:mt-1.5 leading-relaxed text-gray-600 dark:text-slate-200">
                                        {item.description || 'No details provided.'}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {checklistItems.length === 0 && (
                            <div className="text-sm sm:text-xs rounded-md sm:rounded-lg p-2.5 sm:p-3 border bg-gray-50 border-gray-200 text-gray-600 dark:bg-slate-900/40 dark:border-slate-600 dark:text-slate-300">
                                No actionable items. Try a clearer document.
                            </div>
                        )}
                    </div>

                    {checklist.risks && (
                        <div className="mt-2.5 sm:mt-4 p-2 sm:p-2 rounded border bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/30">
                            <h4 className="text-sm sm:text-xs font-bold mb-1 text-red-700 dark:text-red-200">⚠️ Risks</h4>
                            <p className="text-sm sm:text-xs text-red-600 dark:text-red-200/90">{checklist.risks}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center text-sm sm:text-sm mt-10 text-gray-500 dark:text-slate-400">Upload a document to see a checklist here.</div>
            )}
        </div>
    );
}
