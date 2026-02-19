import { DocumentContext } from '../types';
import { useTheme } from './ThemeProvider';

interface Props {
    doc: DocumentContext;
}

export default function DocumentChip({ doc }: Props) {
    const { theme } = useTheme();
    return (
        <span className={`flex items-center gap-1 border px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm ${theme.badge}`}>
            ✅ {doc.name}
            {doc.truncated ? ' (truncated)' : ''}
        </span>
    );
}
