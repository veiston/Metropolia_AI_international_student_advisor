import { DocumentContext } from '../types';

interface Props {
    doc: DocumentContext;
}

export default function DocumentChip({ doc }: Props) {
    return (
        <span className="flex items-center gap-0.5 sm:gap-1 border px-2 sm:px-3 py-1 sm:py-1 rounded-full text-sm sm:text-sm border-gray-300 bg-gray-100 text-gray-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            <span>✅</span>
            <span className="truncate max-w-[160px] sm:max-w-none">{doc.name}</span>
            {doc.truncated ? <span className="shrink-0">…</span> : null}
        </span>
    );
}
