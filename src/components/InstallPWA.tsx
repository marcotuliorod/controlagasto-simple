import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X, Share } from "lucide-react";
import { usePWAInstall } from "@/providers/PWAInstallProvider";

export default function InstallPWA() {
  const { canInstall, isIOS, isStandalone, requestInstall } = usePWAInstall();
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isStandalone) {
      return;
    }

    // Check if user already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return; // Don't show for 7 days after dismiss
    }

    // Show card if iOS (for instructions) or if can install (Android/desktop)
    if (isIOS || canInstall) {
      setShowCard(true);
    }
  }, [isIOS, canInstall, isStandalone]);

  const handleDismiss = () => {
    setShowCard(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  const handleInstall = async () => {
    const outcome = await requestInstall();
    if (outcome === 'accepted') {
      setShowCard(false);
    }
  };

  if (!showCard) {
    return null;
  }

  // iOS instructions
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Instalar App (iOS)</CardTitle>
                  <CardDescription className="text-xs">
                    Adicione à tela de início
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="font-semibold text-foreground">1.</span>
                Toque no ícone de compartilhar <Share className="inline h-4 w-4" />
              </li>
              <li className="flex items-center gap-2">
                <span className="font-semibold text-foreground">2.</span>
                Role para baixo e toque em "Adicionar à Tela de Início"
              </li>
              <li className="flex items-center gap-2">
                <span className="font-semibold text-foreground">3.</span>
                Toque em "Adicionar"
              </li>
            </ol>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="w-full mt-3"
            >
              Entendi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Android/Desktop install prompt
  if (canInstall) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Instalar App</CardTitle>
                  <CardDescription className="text-xs">
                    Use offline e acesse mais rápido
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2 pt-0">
            <Button
              onClick={handleInstall}
              className="flex-1"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Instalar
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
            >
              Agora não
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
