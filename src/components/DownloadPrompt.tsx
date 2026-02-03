import { useState } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { useSync } from '@/hooks/useSync';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DownloadPrompt() {
  const { showDownloadPrompt, setShowDownloadPrompt, downloadProgress } =
    useSyncStore();
  const { downloadOfflineBasemap } = useSync();
  const [error, setError] = useState<string | null>(null);

  if (!showDownloadPrompt) return null;

  const handleDownload = async () => {
    setError(null);
    try {
      await downloadOfflineBasemap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleSkip = () => {
    setShowDownloadPrompt(false);
  };

  const isDownloading = downloadProgress !== null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-field-darker rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-field-accent/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-field-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-xl">
              Offline Satellite Basemap
            </h2>
          </div>
          <p className="text-white/70">
            Download the satellite basemap for offline use. This is recommended
            for field operations where internet may not be available.
          </p>
        </div>

        {/* Progress or actions */}
        <div className="p-6">
          {isDownloading ? (
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-field-accent transition-all duration-300"
                  style={{ width: `${downloadProgress.percentage}%` }}
                />
              </div>

              {/* Progress text */}
              <div className="flex justify-between text-sm">
                <span className="text-white/70">
                  {downloadProgress.phase === 'fetching'
                    ? 'Downloading...'
                    : downloadProgress.phase === 'storing'
                    ? 'Saving...'
                    : 'Complete'}
                </span>
                <span className="text-white/50">
                  {formatBytes(downloadProgress.loaded)}
                  {downloadProgress.total > 0 &&
                    ` / ${formatBytes(downloadProgress.total)}`}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-field-danger/20 rounded-lg border border-field-danger/30">
                  <p className="text-field-danger text-sm">{error}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-medium
                           hover:bg-white/20 transition-colors touch-manipulation active:scale-[0.98]"
                >
                  Skip for Now
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 px-4 rounded-xl bg-field-accent text-field-darker font-semibold
                           hover:bg-field-accent/90 transition-colors touch-manipulation active:scale-[0.98]"
                >
                  Download
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6">
          <p className="text-white/40 text-xs text-center">
            The basemap can be several hundred MB. Download over WiFi
            recommended.
          </p>
        </div>
      </div>
    </div>
  );
}
