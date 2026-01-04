import { useTheme } from './ThemeProvider';

interface Props {
    progress: number;
}

export default function UploadProgress({ progress }: Props) {
    const { theme } = useTheme();
    if (progress <= 0) return null;
    return (
        <div className={`mt-3 h-2 rounded-full overflow-hidden ${theme.progressTrack}`}>
            <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-700 transition-all"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
