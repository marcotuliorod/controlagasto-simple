import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallContextType {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  isInstalled: boolean;
  requestInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  resetDismiss: () => void;
  diagnostics: {
    swReady: boolean;
    manifestDetected: boolean;
  };
}

const PWAInstallContext = createContext<PWAInstallContextType | undefined>(undefined);

export const usePWAInstall = () => {
  const context = useContext(PWAInstallContext);
  if (!context) {
    throw new Error("usePWAInstall must be used within PWAInstallProvider");
  }
  return context;
};

export const PWAInstallProvider = ({ children }: { children: ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [manifestDetected, setManifestDetected] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Check Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => {
          setSwReady(true);
          if (import.meta.env.DEV) {
            console.log('✅ [PWA] Service Worker ready');
          }
        })
        .catch(() => setSwReady(false));
    }

    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    setManifestDetected(!!manifestLink?.getAttribute('href'));

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      if (import.meta.env.DEV) {
        console.log('✅ [PWA] Install prompt captured');
      }
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
      toast.success('App instalado com sucesso!');
      
      if (import.meta.env.DEV) {
        console.log('✅ [PWA] App installed');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const requestInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ [PWA] No install prompt available');
      }
      return 'unavailable';
    }

    try {
      if (import.meta.env.DEV) {
        console.log('📱 [PWA] Showing install prompt');
      }

      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (import.meta.env.DEV) {
        console.log(`📱 [PWA] User choice: ${outcome}`);
      }

      if (outcome === 'accepted') {
        toast.success('App instalado com sucesso!');
        setIsInstalled(true);
        setDeferredPrompt(null);
      } else {
        toast.info('Instalação cancelada');
      }

      return outcome;
    } catch (error) {
      console.error('❌ [PWA] Error showing install prompt:', error);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  const resetDismiss = useCallback(() => {
    localStorage.removeItem('pwa-install-dismissed');
    if (import.meta.env.DEV) {
      console.log('🔄 [PWA] Dismiss state cleared');
    }
  }, []);

  const value: PWAInstallContextType = {
    canInstall: !!deferredPrompt && !isInstalled,
    isIOS,
    isStandalone,
    isInstalled,
    requestInstall,
    resetDismiss,
    diagnostics: {
      swReady,
      manifestDetected,
    },
  };

  return (
    <PWAInstallContext.Provider value={value}>
      {children}
    </PWAInstallContext.Provider>
  );
};
