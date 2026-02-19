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
    href: string;
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

const HINT_KEYWORDS: Record<string, string> = {
    kela: 'Kela',
    migri: 'Migri',
    yths: 'YTHS',
    metropolia: 'Metropolia',
};

const VERTEX_TARGET_KEYS = ['url', 'uri', 'target', 'targetUrl', 'source', 'sourceUri', 'link', 'href', 'destination', 'q', 'query', 'u'];

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
                    // If still not a full URL, attempt to prepend https for host-like strings.
                    if (/^[\w.-]+\.[A-Za-z]{2,}/.test(decodedAgain)) {
                        return `https://${decodedAgain}`;
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

function hintToLabel(hint?: string): string | null {
    if (!hint) return null;
    const lower = hint.toLowerCase();
    for (const [needle, label] of Object.entries(HINT_KEYWORDS)) {
        if (lower.includes(needle)) return label;
    }
    return null;
}

function cleanCitationUrl(url: string, hint?: string): CleanedCitation {
    try {
        let targetUrl: string | null = url;
        if (url.includes('vertexaisearch')) {
            const decodedTarget = extractTargetFromVertexUrl(url);
            if (decodedTarget) {
                targetUrl = decodedTarget;
            }
        }
        const parsed = new URL(targetUrl);
        let label = friendlyLabelFromHostname(parsed.hostname);

        if (label === 'Web Source') {
            const hinted = hintToLabel(hint);
            if (hinted) {
                label = hinted;
            }
        }

        return {
            display: label,
            title: label,
            meta: targetUrl,
            href: targetUrl,
        };
    } catch {
        const hinted = hintToLabel(hint);
        return {
            display: hinted || 'Source',
            title: hinted || 'Source',
            meta: url.substring(0, 60),
            href: url,
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
            <div className={`max-w-[82%] sm:max-w-[85%] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm ${isUser ? theme.bubbleUser : theme.bubbleAssistant}`}>
                <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>

                {msg.steps ? (
                    <div className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3">
                        {msg.steps.map((step, sIdx) => (
                            <div
                                key={sIdx}
                                className={`p-3 sm:p-4 rounded-lg border-l-4 border-orange-500 shadow-sm text-xs sm:text-sm ${darkMode ? 'bg-slate-900/50 border border-slate-700 text-slate-100' : 'bg-gray-50 border-gray-300'
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
                    <div className={`mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t ${darkMode ? 'border-slate-700' : 'border-gray-300'}`}>
                        <button
                            onClick={() => setSourcesExpanded(!sourcesExpanded)}
                            className={`w-full flex items-center gap-2 mb-2 p-1.5 sm:p-2 rounded-lg transition-colors ${darkMode
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
                                    const title = cit.content || cit.source;
                                    const cleaned = cleanCitationUrl(cit.url, title);
                                    return (
                                        <a
                                            key={cIdx}
                                            href={cleaned.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`block rounded-lg p-2.5 sm:p-3 shadow-sm transition hover:shadow-md ${theme.linkCard} w-full break-words`}
                                        >
                                            <span className="text-xs uppercase tracking-wide font-semibold text-gray-600 dark:text-slate-400">{cleaned.display}</span>
                                            <span className={`text-xs sm:text-sm font-medium block mt-1 break-words ${theme.linkCardTitle}`}>{title || cleaned.title}</span>
                                            <span className={`text-[10px] sm:text-[11px] mt-1 break-all ${theme.linkCardMeta}`}>{cleaned.meta}</span>
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
