// src/ui/components/PWAInstallPrompt.tsx
import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Zap, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    // Check if already running as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay for better UX
      setTimeout(() => setShow(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setTimeout(() => setShow(false), 2500);
      localStorage.setItem('pwa_install_dismissed', 'installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setTimeout(() => setShow(false), 2500);
        localStorage.setItem('pwa_install_dismissed', 'installed');
      }
    } catch (err) {
      console.error('PWA install error:', err);
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes pwaSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pwaShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pwaIconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .pwa-install-btn {
          transition: all 0.2s ease;
        }
        .pwa-install-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5) !important;
        }
        .pwa-install-btn:active {
          transform: translateY(0);
        }
        .pwa-dismiss-btn {
          transition: all 0.15s ease;
        }
        .pwa-dismiss-btn:hover {
          background: rgba(255,255,255,0.15) !important;
        }
        @media print {
          .pwa-install-prompt { display: none !important; }
        }
      `}</style>

      <div
        className="pwa-install-prompt"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: '1.5rem',
          zIndex: 9999,
          width: '320px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)',
          animation: 'pwaSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          fontFamily: "'Tajawal', sans-serif",
          direction: 'rtl',
        }}
      >
        {/* Decorative top gradient bar */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, #818cf8, #a78bfa, #f472b6, #818cf8)',
          backgroundSize: '200% auto',
          animation: 'pwaShimmer 3s linear infinite',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1rem 0.5rem',
        }}>
          {/* App Icon Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              animation: 'pwaIconPulse 2.5s ease-in-out infinite',
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
            }}>
              <Smartphone size={22} color="white" />
            </div>
            <div>
              <p style={{
                color: 'white',
                fontWeight: '800',
                fontSize: '0.88rem',
                margin: 0,
                lineHeight: 1.3,
              }}>تثبيت دكّان</p>
              <p style={{
                color: 'rgba(199, 210, 254, 0.75)',
                fontSize: '0.72rem',
                margin: 0,
                fontWeight: '500',
              }}>Dukkan • تطبيق سريع • يعمل بدون إنترنت</p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="pwa-dismiss-btn"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Features row */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.65rem 1rem',
        }}>
          {[
            { icon: <Zap size={11} />, label: 'تشغيل فوري' },
            { icon: <WifiOff size={11} />, label: 'أوفلاين' },
            { icon: <Download size={11} />, label: 'بدون متجر' },
          ].map((feat, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '99px',
              padding: '0.25rem 0.55rem',
              color: 'rgba(199, 210, 254, 0.9)',
              fontSize: '0.68rem',
              fontWeight: '600',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {feat.icon}
              <span>{feat.label}</span>
            </div>
          ))}
        </div>

        {/* Install Button */}
        <div style={{ padding: '0.5rem 1rem 1rem' }}>
          {installed ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.7rem',
              background: 'rgba(74, 222, 128, 0.15)',
              borderRadius: '12px',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              color: '#4ade80',
              fontWeight: '700',
              fontSize: '0.85rem',
            }}>
              ✅ تم التثبيت بنجاح!
            </div>
          ) : (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="pwa-install-btn"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: installing
                  ? 'rgba(99,102,241,0.5)'
                  : 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: '800',
                fontSize: '0.9rem',
                cursor: installing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
                fontFamily: "'Tajawal', sans-serif",
                letterSpacing: '0.01em',
              }}
            >
              {installing ? (
                <>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                  }} />
                  جاري التثبيت...
                </>
              ) : (
                <>
                  <Download size={16} />
                  تثبيت التطبيق الآن
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default PWAInstallPrompt;
