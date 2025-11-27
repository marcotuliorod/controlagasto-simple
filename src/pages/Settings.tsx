import { useState, useEffect } from "react";
import { Bell, Download, Send, Share, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePWAInstall } from "@/providers/PWAInstallProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PushOnboarding from "@/components/PushOnboarding";

export default function Settings() {
  const { isSupported, isSubscribed, subscribe, unsubscribe, sendTestNotification } = usePushNotifications();
  const { canInstall, isIOS, isStandalone, requestInstall, diagnostics } = usePWAInstall();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [swStatus, setSwStatus] = useState<'checking' | 'active' | 'error'>('checking');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => setSwStatus('active'))
        .catch(() => setSwStatus('error'));
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleInstallPrompt = async () => {
    const outcome = await requestInstall();
    
    if (outcome === 'unavailable') {
      if (isIOS) {
        toast.info('No iOS, use o botão de Compartilhar para adicionar à tela de início');
      } else {
        toast.info('Instalação ainda não disponível. Aguarde alguns segundos e tente novamente.');
      }
    }
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    await sendTestNotification();
    setIsSendingTest(false);
  };

  const handleActivateNotifications = async () => {
    await subscribe();
  };

  const handleDismissOnboarding = () => {
    toast.info("Você pode ativar as notificações mais tarde nas configurações");
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <PushOnboarding 
        onActivate={handleActivateNotifications}
        onDismiss={handleDismissOnboarding}
      />
      
      <div>
        <h1 className="text-3xl font-medium">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e configurações do app
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Notificações Push</CardTitle>
              <CardDescription>
                Receba alertas quando ultrapassar suas metas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isSupported ? (
            <p className="text-sm text-muted-foreground">
              Push notifications não são suportadas neste navegador
            </p>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {isSubscribed ? 'Notificações ativadas' : 'Notificações desativadas'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed 
                    ? 'Você receberá alertas sobre suas metas' 
                    : 'Ative para receber alertas importantes'}
                </p>
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={handleToggleNotifications}
              />
            </div>
          )}
          
          {isSubscribed && (
            <div className="space-y-4">
              <div className="pt-4 mt-4 border-t">
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-muted-foreground">Você receberá notificações sobre:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Alerta ao atingir 80% da meta mensal</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Alerta ao atingir 100% da meta</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Parabéns quando economizar 20%+ do orçamento</span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={handleSendTestNotification}
                  disabled={isSendingTest}
                  variant="outline"
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSendingTest ? "Enviando..." : "Enviar Notificação de Teste"}
                </Button>
              </div>
            </div>
          )}

          {import.meta.env.DEV && (
            <div className="pt-2 mt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Service Worker: <span className={swStatus === 'active' ? 'text-green-500' : swStatus === 'error' ? 'text-red-500' : ''}>{swStatus}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Instalação do App</CardTitle>
              <CardDescription>
                Instale o app para acesso rápido e uso offline
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isStandalone ? (
            <div className="text-sm text-muted-foreground">
              ✓ App já está instalado
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Instale o app para:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Acesso mais rápido</li>
                <li>Funcionar offline</li>
                <li>Receber notificações</li>
                <li>Economizar dados móveis</li>
              </ul>

              {/* PWA Install */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" />
                    Instalação do App
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isStandalone ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        App já está instalado
                      </span>
                    </div>
                  ) : isIOS ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Para instalar no iOS:
                      </p>
                      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Toque no botão de compartilhar (ícone de quadrado com seta)</li>
                        <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                        <li>Toque em "Adicionar" para confirmar</li>
                      </ol>
                      <p className="text-xs text-muted-foreground pt-2">
                        💡 Após instalar, abra o app pela tela inicial para a melhor experiência.
                      </p>
                    </div>
                  ) : canInstall ? (
                    <div className="space-y-2">
                      <Button
                        onClick={handleInstallPrompt}
                        className="w-full"
                        variant="default"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Instalar Agora
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Instale o app para acesso rápido e uso offline
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">
                          Instalação ainda não disponível. Verifique:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>✓ Use Chrome, Edge ou Samsung Internet</li>
                          <li>✓ Visite o app pelo menos 2 vezes</li>
                          <li>✓ Aguarde alguns segundos na página</li>
                          <li>✓ Conexão HTTPS ativa</li>
                        </ul>
                      </div>
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        💡 Dica: Tente recarregar a página ou adicionar aos favoritos do navegador
                      </p>
                    </div>
                  )}
                  
                  {import.meta.env.DEV && diagnostics && (
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t mt-3">
                      <p className="font-semibold">🔧 Debug Info (Dev Only):</p>
                      <div className="grid grid-cols-2 gap-1">
                        <p>• SW Ready:</p>
                        <p className={diagnostics.swReady ? 'text-green-500' : 'text-red-500'}>
                          {diagnostics.swReady ? '✓ Sim' : '✗ Não'}
                        </p>
                        <p>• Manifest:</p>
                        <p className={diagnostics.manifestDetected ? 'text-green-500' : 'text-red-500'}>
                          {diagnostics.manifestDetected ? '✓ Sim' : '✗ Não'}
                        </p>
                        <p>• Can Install:</p>
                        <p className={canInstall ? 'text-green-500' : 'text-red-500'}>
                          {canInstall ? '✓ Sim' : '✗ Não'}
                        </p>
                        <p>• Standalone:</p>
                        <p className={isStandalone ? 'text-green-500' : 'text-muted-foreground'}>
                          {isStandalone ? '✓ Sim' : '- Não'}
                        </p>
                        <p>• iOS:</p>
                        <p className={isIOS ? 'text-blue-500' : 'text-muted-foreground'}>
                          {isIOS ? '✓ Sim' : '- Não'}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          console.log('=== PWA DIAGNOSTIC REPORT ===');
                          console.log('User Agent:', navigator.userAgent);
                          console.log('Standalone:', isStandalone);
                          console.log('iOS:', isIOS);
                          console.log('Can Install:', canInstall);
                          console.log('Diagnostics:', diagnostics);
                          console.log('SW Registration:', navigator.serviceWorker?.controller);
                          console.log('Manifest:', document.querySelector('link[rel="manifest"]'));
                          console.log('==============================');
                          toast.success('Diagnóstico completo no console');
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                      >
                        📋 Log Diagnóstico Completo
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
