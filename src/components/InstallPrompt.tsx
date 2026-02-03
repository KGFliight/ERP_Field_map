import { useState, useEffect, useCallback } from 'react';

// Global state for manually showing the install prompt
let showInstallPromptCallback: (() => void) | null = null;

export function canShowInstallPrompt(): boolean {
  return isIOSSafari() && !isStandalone();
}

export function triggerInstallPrompt(): void {
  if (showInstallPromptCallback) {
    showInstallPromptCallback();
  }
}

// Detect iOS
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Detect if running in Safari (not Chrome/Firefox on iOS)
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  return isIOS() && /Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
}

// Check if running as installed PWA
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Check if prompt was seen recently (within 24 hours)
function wasSeenRecently(): boolean {
  const lastSeen = localStorage.getItem('pwa-install-prompt-seen');
  if (!lastSeen) return false;
  const lastSeenTime = parseInt(lastSeen, 10);
  const hoursSince = (Date.now() - lastSeenTime) / (1000 * 60 * 60);
  return hoursSince < 24;
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Callback for manual trigger
  const showManually = useCallback(() => {
    if (canShowInstallPrompt()) {
      setShowPrompt(true);
      setDismissed(false);
    }
  }, []);

  // Register the callback
  useEffect(() => {
    showInstallPromptCallback = showManually;
    return () => {
      showInstallPromptCallback = null;
    };
  }, [showManually]);

  useEffect(() => {
    // Show on iOS Safari when not installed
    if (isIOSSafari() && !isStandalone() && !wasSeenRecently()) {
      // Show after a short delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    // Remember dismissal
    localStorage.setItem('pwa-install-prompt-seen', Date.now().toString());
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    setDismissed(true);
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-slide-up">
      <div className="bg-field-darker/95 backdrop-blur-sm rounded-xl shadow-2xl 
                      border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-field-accent/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-field-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Install ERP Field Map</h3>
              <p className="text-white/60 text-sm">Add to your home screen for offline access</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-field-accent/20 flex items-center justify-center text-field-accent font-bold text-xs">1</div>
            <span className="text-white/90">
              Tap the{' '}
              <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-white/10 rounded">
                {/* iOS Share icon (box with arrow up) */}
                <svg className="w-4 h-4 text-field-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="ml-1 text-field-accent font-medium">Share</span>
              </span>
              {' '}button at the bottom of Safari
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-field-accent/20 flex items-center justify-center text-field-accent font-bold text-xs">2</div>
            <span className="text-white/90">
              Scroll down and tap{' '}
              <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-white/10 rounded">
                <svg className="w-4 h-4 text-field-accent mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-field-accent font-medium">Add to Home Screen</span>
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-field-accent/20 flex items-center justify-center text-field-accent font-bold text-xs">3</div>
            <span className="text-white/90">
              Tap <span className="text-field-accent font-medium">"Add"</span> in the top right corner
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex border-t border-white/10">
          <button
            onClick={handleRemindLater}
            className="flex-1 py-3 text-white/60 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Later
          </button>
          <div className="w-px bg-white/10" />
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 text-field-accent text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
