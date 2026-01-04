import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { useTheme } from './ThemeProvider';
import { useState } from 'react';

interface Props {
    msg: Message;
    showSources: boolean;
}

// Helper to extract domain from URL or clean up raw API URLs
function cleanCitationUrl(url: string): { display: string; title: string } {
    try {
        // If it's a vertexaisearch internal URL, extract source info
        if (url.includes('vertexaisearch')) {
            const parsed = new URL(url);
            const params = new URLSearchParams(parsed.search);
            // Try to get a meaningful organization name from URL path or domain
            const pathname = parsed.pathname || '';
            const parts = pathname.split('/').filter(p => p);
            
            // Common organization name patterns (try to extract from domain or path)
            let orgName = '';
            
            // Extract from domain if it contains the organization
            if (parsed.hostname) {
                // e.g., 'kela.fi' -> 'Kela', 'metropolia.fi' -> 'Metropolia', 'yths.fi' -> 'YTHS'
                const domainParts = parsed.hostname.split('.');
                if (domainParts[0]) {
                    orgName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
                }
            }
            
            return { display: orgName || 'Search Result', title: orgName || 'Search Result' };
        }
        const urlObj = new URL(url);
        const domain = urlObj.hostname || 'Source';
        return { display: domain, title: domain };
    } catch {
        // If URL is malformed, show truncated version
        return { display: url.substring(0, 40), title: url };
    }
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
                    <div className="mt-4 space-y-3">
                        {msg.steps.map((step, sIdx) => (
                            <div
                                key={sIdx}
                                className={`p-4 rounded-lg border-l-4 border-orange-500 shadow-sm text-sm ${darkMode ? 'bg-slate-900/50 border border-slate-700 text-slate-100' : 'bg-gray-50 border-gray-300'
                                    }`}
                            >
                                <div className={`font-bold ${darkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                                    {step.title}{' '}
                                    {step.urgency ? <span className="text-red-500 text-xs ml-2">({step.urgency})</span> : null}
                                </div>
                                <div className={`mt-2 ${darkMode ? 'text-slate-200' : 'text-gray-700'}`}>{step.description}</div>
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
                                {visibleCitations.map((cit, cIdx) => {
                                    const cleaned = cleanCitationUrl(cit.url);
                                    return (
                                        <a
                                            key={cIdx}
                                            href={cit.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`block rounded-lg p-3 shadow-sm transition hover:shadow-md ${theme.linkCard}`}
                                        >
                                            <span className="text-xs uppercase tracking-wide font-semibold text-gray-600 dark:text-slate-400">{cleaned.display}</span>
                                            <span className={`text-sm font-medium block mt-1 break-words max-w-full ${theme.linkCardTitle}`}>{cit.content || cleaned.title}</span>
                                        </a>
                                    );
                                })}

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
