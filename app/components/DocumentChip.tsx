import { DocumentContext } from '../types';
import { useTheme } from './ThemeProvider';

interface Props {
    doc: DocumentContext;
}

export default function DocumentChip({ doc }: Props) {
    const { theme } = useTheme();
    return (
        <span className={`flex items-center gap-0.5 sm:gap-1 border px-2 sm:px-3 py-1 sm:py-1 rounded-full text-sm sm:text-sm ${theme.badge}`}>
            <span>✅</span>
            <span className="truncate max-w-[160px] sm:max-w-none">{doc.name}</span>
            {doc.truncated ? <span className="shrink-0">…</span> : null}
        </span>
    );
}
