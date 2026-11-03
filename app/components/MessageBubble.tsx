import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { useState } from 'react';

interface Props {
    msg: Message;
    showSources: boolean;
}

function getHost(url: string) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'Source';
    }
}

export default function MessageBubble({ msg, showSources }: Props) {
    const isUser = msg.role === 'user';
    const [sourcesExpanded, setSourcesExpanded] = useState(false);
    const citations = msg.citations ?? [];
    const hasSources = msg.role === 'assistant' && showSources && citations.length > 0;

    const visibleCitations = sourcesExpanded ? citations : citations.slice(0, 3);
    const hasMoreSources = citations.length > 3;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[85%] rounded-lg sm:rounded-2xl p-2.5 sm:p-4 shadow-sm ${isUser ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-slate-100'}`}>
                <div className="prose prose-sm max-w-none mobile-bubble-text text-sm sm:text-base dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>

                {hasSources ? (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-300 dark:border-slate-700">
                        <button
                            onClick={() => setSourcesExpanded(!sourcesExpanded)}
                            className="w-full flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 p-1 sm:p-2 rounded-md sm:rounded-lg text-xs sm:text-sm transition-colors hover:bg-gray-100 text-gray-600 dark:hover:bg-slate-800 dark:text-slate-200"
                        >
                            <span role="img" aria-label="sources">📚</span>
                            <span className="font-semibold">Sources ({citations.length})</span>
                            <span className={`ml-auto text-xs sm:text-sm transition-transform ${sourcesExpanded ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </button>

                        {(sourcesExpanded || visibleCitations.length > 0) && (
                            <div className="space-y-1.5 sm:space-y-2">
                                {visibleCitations.map((cit, cIdx) => {
                                    const host = getHost(cit.url);
                                    const title = cit.content || cit.source || host;
                                    return (
                                        <a
                                            key={cIdx}
                                            href={cit.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block rounded-md sm:rounded-lg p-1.5 sm:p-3 shadow-sm transition hover:shadow-md border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 w-full break-words"
                                        >
                                            <span className="text-xs uppercase tracking-wide font-semibold text-gray-600 dark:text-slate-400">{host}</span>
                                            <span className="text-xs sm:text-sm font-medium block mt-0.5 sm:mt-1 break-words text-gray-800 dark:text-slate-100">{title}</span>
                                            <span className="text-[10px] sm:text-[11px] mt-0.5 sm:mt-1 break-all text-gray-500 dark:text-slate-400">{cit.url}</span>
                                        </a>
                                    );
                                })}

                                {hasMoreSources && !sourcesExpanded && (
                                    <button
                                        onClick={() => setSourcesExpanded(true)}
                                        className="w-full mt-1.5 sm:mt-2 p-2 sm:p-2 text-xs sm:text-sm font-medium rounded-md sm:rounded-lg transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                    >
                                        Show {citations.length - 3} more source{citations.length - 3 !== 1 ? 's' : ''}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
