import { useState } from "react";
import { Bell, Download, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleInstallPrompt = () => {
    localStorage.removeItem('pwa-install-dismissed');
    toast.info('Recarregue a página para ver o prompt de instalação');
  };

  const handleSendTestNotification = async () => {
    if (!isSubscribed) {
      toast.error("Ative as notificações primeiro");
      return;
    }

    setIsSendingTest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: user.id,
          title: "🎉 Notificação de Teste",
          body: "Suas notificações estão funcionando perfeitamente!",
          url: "/settings",
        },
      });

      if (error) throw error;

      toast.success(`✅ Notificação enviada! (${data.sent} dispositivo(s))`);
      
      if (data.removed > 0) {
        toast.info(`${data.removed} inscrição(ões) inválida(s) removida(s)`);
      }
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      toast.error("Erro ao enviar notificação: " + error.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
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
            <div className="pt-4 mt-4 border-t">
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
