import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { useTheme } from './ThemeProvider';
import { useState } from 'react';

interface Props {
    msg: Message;
    showSources: boolean;
}

export default function MessageBubble({ msg, showSources }: Props) {
    const { theme, darkMode } = useTheme();
    const isUser = msg.role === 'user';
    const [sourcesExpanded, setSourcesExpanded] = useState(false);

    const visibleCitations = msg.citations && msg.citations.length > 0
        ? (sourcesExpanded ? msg.citations : msg.citations.slice(0, 3))
        : [];

    const hasMoreSources = msg.citations && msg.citations.length > 3;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${isUser ? theme.bubbleUser : theme.bubbleAssistant}`}>
                <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>

                {msg.steps ? (
                    <div className="mt-3 space-y-2">
                        {msg.steps.map((step, sIdx) => (
                            <div
                                key={sIdx}
                                className={`p-3 rounded-lg border-l-4 border-orange-500 shadow-sm text-sm ${darkMode ? 'bg-slate-900/50 border border-slate-700 text-slate-100' : 'bg-white'
                                    }`}
                            >
                                <div className="font-bold text-orange-600">
                                    {step.title}{' '}
                                    {step.urgency ? <span className="text-red-500 text-xs">({step.urgency})</span> : null}
                                </div>
                                <div>{step.description}</div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && showSources ? (
                    <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                        <button
                            onClick={() => setSourcesExpanded(!sourcesExpanded)}
                            className={`w-full flex items-center gap-2 mb-2 p-2 rounded-lg transition-colors ${darkMode
                                    ? 'hover:bg-slate-800 text-slate-200'
                                    : 'hover:bg-gray-100 text-gray-600'
                                }`}
                        >
                            <span role="img" aria-label="sources">📚</span>
                            <span className="font-semibold">Sources {msg.citations.length > 0 && `(${msg.citations.length})`}</span>
                            <span className={`ml-auto text-sm transition-transform ${sourcesExpanded ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </button>

                        {(sourcesExpanded || visibleCitations.length > 0) && (
                            <div className="space-y-2">
                                {visibleCitations.map((cit, cIdx) => (
                                    <a
                                        key={cIdx}
                                        href={cit.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex flex-col rounded-lg p-3 shadow-sm transition ${theme.linkCard}`}
                                    >
                                        <span className="text-xs uppercase tracking-wide text-orange-600">{cit.source}</span>
                                        <span className={`text-[13px] font-medium break-words ${theme.linkCardTitle}`}>{cit.content || cit.url}</span>
                                        <span className={`text-[11px] mt-1 ${theme.linkCardMeta}`}>{cit.url}</span>
                                    </a>
                                ))}

                                {hasMoreSources && !sourcesExpanded && (
                                    <button
                                        onClick={() => setSourcesExpanded(true)}
                                        className={`w-full mt-2 p-2 text-sm font-medium rounded-lg transition-colors ${darkMode
                                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Show {msg.citations.length - 3} more source{msg.citations.length - 3 !== 1 ? 's' : ''}
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
