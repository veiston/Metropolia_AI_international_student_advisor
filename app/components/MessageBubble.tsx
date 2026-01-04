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
interface CleanedCitation {
    display: string;
    title: string;
    meta: string;
}

const ORGANIZATION_MAP: Record<string, string> = {
    'kela.fi': 'Kela',
    'migri.fi': 'Migri',
    'metropolia.fi': 'Metropolia',
    'yths.fi': 'YTHS',
    'studyinfo.fi': 'Studyinfo',
    'opintopolku.fi': 'Opintopolku',
    'finlex.fi': 'Finlex',
};

const VERTEX_TARGET_KEYS = ['url', 'uri', 'target', 'source', 'sourceUri', 'link', 'href', 'destination'];

function normalizeHostname(hostname?: string): string {
    if (!hostname) return '';
    return hostname.replace(/^www\./i, '').toLowerCase();
}

function friendlyLabelFromHostname(hostname?: string): string {
    const normalized = normalizeHostname(hostname);
    if (!normalized) return 'Source';
    if (normalized.includes('vertexaisearch')) {
        return 'Web Source';
    }
    for (const [suffix, label] of Object.entries(ORGANIZATION_MAP)) {
        if (normalized.endsWith(suffix)) {
            return label;
        }
    }
    const primary = normalized.split('.')[0];
    return primary ? primary.charAt(0).toUpperCase() + primary.slice(1) : 'Source';
}

function extractTargetFromVertexUrl(url: string): string | null {
    try {
        const parsed = new URL(url);
        for (const key of VERTEX_TARGET_KEYS) {
            const raw = parsed.searchParams.get(key);
            if (!raw) continue;
            try {
                const decoded = new URL(raw);
                return decoded.href;
            } catch {
                if (raw.startsWith('http')) {
                    return raw;
                }
                try {
                    const decodedAgain = decodeURIComponent(raw);
                    if (decodedAgain.startsWith('http')) {
                        return decodedAgain;
                    }
                } catch {
                    continue;
                }
            }
        }
    } catch {
        // ignore parsing errors
    }
    return null;
}

function cleanCitationUrl(url: string): CleanedCitation {
    try {
        let targetUrl: string | null = url;
        if (url.includes('vertexaisearch')) {
            const decodedTarget = extractTargetFromVertexUrl(url);
            if (decodedTarget) {
                targetUrl = decodedTarget;
            }
        }
        const parsed = new URL(targetUrl);
        const label = friendlyLabelFromHostname(parsed.hostname);

        return {
            display: label,
            title: label,
            meta: targetUrl,
        };
    } catch {
        return {
            display: 'Source',
            title: 'Source',
            meta: url.substring(0, 60),
        };
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
                                            <span className={`text-[11px] mt-1 ${theme.linkCardMeta}`}>{cleaned.meta}</span>
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
