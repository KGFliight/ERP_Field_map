import { useSyncStore } from '@/stores/syncStore';
import { useSync } from '@/hooks/useSync';

function formatLastSync(isoDate: string | null): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}

function getStatusColor(state: string): string {
  switch (state) {
    case 'synced':
      return 'bg-field-success';
    case 'syncing':
      return 'bg-field-accent animate-pulse';
    case 'stale':
    case 'offline':
      return 'bg-field-warning';
    case 'error':
      return 'bg-field-danger';
    default:
      return 'bg-gray-500';
  }
}

function getStatusLabel(state: string): string {
  switch (state) {
    case 'synced':
      return 'Synced';
    case 'syncing':
      return 'Syncing...';
    case 'stale':
      return 'Stale';
    case 'offline':
      return 'Offline';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

export function SyncStatus() {
  const { status } = useSyncStore();
  const { sync } = useSync();

  const handleSyncClick = () => {
    if (status.state !== 'syncing') {
      sync();
    }
  };

  const lastSyncText = status.lastSync ? formatLastSync(status.lastSync) : null;

  return (
    <button
      onClick={handleSyncClick}
      disabled={status.state === 'syncing'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 
                 transition-colors touch-manipulation active:scale-95 disabled:opacity-50"
      title={status.message || getStatusLabel(status.state)}
    >
      {/* Status indicator dot */}
      <span
        className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status.state)}`}
      />

      {/* Status text with timestamp below */}
      <div className="flex flex-col items-start">
        <span className="text-white/80 text-sm font-medium leading-tight">
          {getStatusLabel(status.state)}
        </span>
        {/* Show last sync time below status - only when synced with server */}
        {lastSyncText && status.state === 'synced' && (
          <span className="text-white/50 text-[10px] leading-tight">
            {lastSyncText}
          </span>
        )}
      </div>

      {/* Sync icon */}
      <svg
        className={`w-4 h-4 text-white/60 ${
          status.state === 'syncing' ? 'animate-spin' : ''
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  );
}
