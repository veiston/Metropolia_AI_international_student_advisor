export interface Citation {
    source: string;
    url: string;
    content?: string;
}

export interface Step {
    title: string;
    description: string;
    links?: string;
    urgency?: string;
}

export interface ChecklistItem {
    title: string;
    description: string;
    urgency?: string;
}

export interface ChecklistPayload {
    summary?: string;
    checklist?: ChecklistItem[];
    risks?: string;
}

export interface DocumentContext {
    name: string;
    text: string;
    truncated?: boolean;
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
    steps?: Step[];
}
