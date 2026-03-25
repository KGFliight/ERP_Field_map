import { useAppPermissionsStore } from '@/stores/appPermissionsStore';

interface AppPermissionsBannerProps {
  visible: boolean;
}

export function AppPermissionsBanner({ visible }: AppPermissionsBannerProps) {
  const openModal = useAppPermissionsStore((s) => s.openModal);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => openModal()}
      className="w-full bg-orange-600/95 hover:bg-orange-500/95 backdrop-blur-sm border-b border-orange-400/40 py-1 px-3 text-center transition-colors touch-manipulation"
    >
      <span className="text-orange-50 text-xs font-semibold tracking-wide leading-snug">
        Please enable all permissions — quick tap here to complete
      </span>
    </button>
  );
}
