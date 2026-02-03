import { useState, useEffect } from 'react';

// Detect iOS
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Check if running as installed PWA
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen');
    
    // Show on iOS Safari when not installed and not seen recently
    if (isIOS() && !isStandalone() && !hasSeenPrompt) {
      // Delay showing the prompt
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    // Remember for 7 days
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
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-medium text-xs">1</div>
            <span className="text-white/80">
              Tap the <span className="inline-flex items-center">
                <svg className="w-5 h-5 mx-1 text-field-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </span> button below
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-medium text-xs">2</div>
            <span className="text-white/80">
              Scroll down and tap <span className="text-field-accent font-medium">"Add to Home Screen"</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-medium text-xs">3</div>
            <span className="text-white/80">
              Tap <span className="text-field-accent font-medium">"Add"</span> to install
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
