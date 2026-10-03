import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check, X, ShieldCheck } from 'lucide-react';

export default function InstallPwaModal() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowPrompt(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("CrossQuest is ready as a PWA! You can also install it via your browser's address bar icon.");
      setShowPrompt(false);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt && !installed) return null;

  return (
    <div className="pwa-install-toast glass-panel">
      <div className="flex-align gap-12">
        <div className="pwa-icon pulse-glow">
          <Smartphone size={20} className="text-cyan" />
        </div>
        <div>
          <div className="pwa-title">Install CrossQuest App</div>
          <div className="pwa-desc">Install as a Progressive Web App for offline access & speed.</div>
        </div>
      </div>
      <div className="flex-align gap-8">
        <button className="btn btn-primary btn-sm" onClick={handleInstallClick}>
          <Download size={14} /> Install
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowPrompt(false)}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
