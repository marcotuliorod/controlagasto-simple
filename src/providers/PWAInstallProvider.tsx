import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { devLog, devWarn } from "@/lib/logger";

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
    devLog('[PWAInstallProvider] 🚀 Iniciando detecção de PWA...');
    
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iOS);
    devLog('[PWAInstallProvider] 📱 iOS detectado:', iOS);

    // Detect standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone);
    devLog('[PWAInstallProvider] 🖥️ Modo standalone:', standalone);

    // Check if Service Worker is ready
    if ('serviceWorker' in navigator) {
      devLog('[PWAInstallProvider] 🔍 Verificando Service Worker...');
      navigator.serviceWorker.ready.then((registration) => {
        setSwReady(true);
        devLog('[PWAInstallProvider] ✅ Service Worker pronto:', {
          scope: registration.scope,
          state: registration.active?.state,
          scriptURL: registration.active?.scriptURL
        });
      }).catch((err) => {
        devWarn('[PWAInstallProvider] ⚠️ Service Worker não está pronto:', err);
      });

      // Log current SW registration state
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          devLog('[PWAInstallProvider] 📊 Registro SW atual:', {
            installing: !!registration.installing,
            waiting: !!registration.waiting,
            active: !!registration.active,
          });
        } else {
          devWarn('[PWAInstallProvider] ⚠️ Nenhum SW registrado ainda');
        }
      });
    } else {
      console.error('[PWAInstallProvider] ❌ Service Worker não suportado');
    }

    // Check if manifest is present
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const hasManifest = !!manifestLink && !!(manifestLink as HTMLLinkElement).href;
    setManifestDetected(hasManifest);
    devLog('[PWAInstallProvider] 📄 Manifest detectado:', hasManifest, manifestLink);

    // Listen for beforeinstallprompt (Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      devLog('[PWAInstallProvider] 🎯 beforeinstallprompt capturado!', e);
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      toast.info('App pode ser instalado! Veja nas configurações.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    devLog('[PWAInstallProvider] 👂 Listener "beforeinstallprompt" adicionado');

    // Check if event was already fired (edge case)
    setTimeout(() => {
      if (!deferredPrompt && !standalone && !iOS) {
        devLog('[PWAInstallProvider] ⏱️ 5s sem beforeinstallprompt. Possíveis causas:');
        devLog('  - App já instalado');
        devLog('  - Critérios não atendidos (HTTPS, manifest, SW, 2+ visitas)');
        devLog('  - Browser não suporta (apenas Chrome/Edge/Samsung)');
      }
    }, 5000);

    // Listen for appinstalled (user installed the PWA)
    const handleAppInstalled = () => {
      devLog('[PWAInstallProvider] 🎉 App foi instalado!');
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('App instalado com sucesso! 🎉');
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    devLog('[PWAInstallProvider] 👂 Listener "appinstalled" adicionado');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      devLog('[PWAInstallProvider] 🧹 Listeners removidos');
    };
  }, []);

  const requestInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    devLog('[PWAInstallProvider] 🎯 requestInstall chamado');
    
    if (!deferredPrompt) {
      devWarn('[PWAInstallProvider] ⚠️ Nenhum prompt de instalação disponível');
      devLog('[PWAInstallProvider] 📊 Estado atual:', {
        deferredPrompt: !!deferredPrompt,
        isStandalone,
        isIOS,
        swReady,
        manifestDetected
      });
      return 'unavailable';
    }

    try {
      devLog('[PWAInstallProvider] 📢 Mostrando prompt de instalação...');
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      devLog('[PWAInstallProvider] 👤 Escolha do usuário:', outcome);
      
      if (outcome === 'accepted') {
        devLog('[PWAInstallProvider] ✅ Usuário aceitou a instalação');
        setIsInstalled(true);
        toast.success('App instalado! Abra pela tela inicial.');
      } else {
        devLog('[PWAInstallProvider] ❌ Usuário recusou a instalação');
        toast.info('Você pode instalar depois nas configurações.');
      }
      
      setDeferredPrompt(null);
      return outcome;
    } catch (err) {
      console.error('[PWAInstallProvider] ❌ Erro ao solicitar instalação:', err);
      toast.error('Erro ao instalar. Tente novamente.');
      return 'unavailable';
    }
  }, [deferredPrompt, isStandalone, isIOS, swReady, manifestDetected]);

  const resetDismiss = useCallback(() => {
    localStorage.removeItem('pwa-install-dismissed');
    devLog('🔄 [PWA] Dismiss state cleared');
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
