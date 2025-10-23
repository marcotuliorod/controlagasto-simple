import { Bell, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { VapidKeyGenerator } from "@/components/VapidKeyGenerator";
import { toast } from "sonner";

export default function Settings() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleInstallPrompt = () => {
    // Clear the dismissed flag to show the install prompt again
    localStorage.removeItem('pwa-install-dismissed');
    toast.info('Recarregue a página para ver o prompt de instalação');
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências e configurações do app
        </p>
      </div>

      <VapidKeyGenerator />

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
          {window.matchMedia('(display-mode: standalone)').matches ? (
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
              <Button onClick={handleInstallPrompt} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Mostrar opção de instalação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
