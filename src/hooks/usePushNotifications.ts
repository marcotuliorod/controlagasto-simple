import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { urlBase64ToUint8Array, isValidVapidKey } from "@/lib/pushUtils";

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window;
      setIsSupported(supported);

      if (supported) {
        // Fetch VAPID public key from backend
        try {
          const { data, error } = await supabase.functions.invoke("get-vapid-public-key");
          
          if (error) {
            console.error("Error fetching VAPID key:", error);
            toast.error("Erro ao configurar notificações");
            return;
          }

          setVapidPublicKey(data.publicKey);

          // Check if already subscribed
          const registration = await navigator.serviceWorker.ready;
          const existingSubscription = await registration.pushManager.getSubscription();

          if (existingSubscription) {
            setSubscription(existingSubscription);
            setIsSubscribed(true);
          }
        } catch (error) {
          console.error("Error checking existing subscription:", error);
        }
      }
    };

    checkSupport();
  }, []);

  const subscribe = async () => {
    if (!isSupported) {
      toast.error("Push notifications não são suportadas neste navegador");
      return;
    }

    if (!vapidPublicKey) {
      toast.error("Configuração de notificações ainda não disponível");
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        toast.error("Permissão de notificações negada");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
        await saveSubscription(existingSubscription);
        toast.success("Notificações já estão ativadas");
        return;
      }

      // Subscribe to push notifications
      const vapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // Validate VAPID key length (P-256 uncompressed = 65 bytes)
      if (!isValidVapidKey(vapidKey)) {
        console.error("Invalid VAPID key length:", vapidKey.length, "expected 65");
        toast.error("Erro na configuração de notificações. Tente novamente.");
        return;
      }

      console.log("✅ VAPID key validated, length:", vapidKey.length);

      // Convert to ArrayBuffer for applicationServerKey
      const applicationServerKey = vapidKey.buffer instanceof ArrayBuffer 
        ? vapidKey.buffer 
        : new Uint8Array(vapidKey).buffer;

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      setSubscription(newSubscription);
      setIsSubscribed(true);
      await saveSubscription(newSubscription);
      toast.success("Notificações ativadas com sucesso!");
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast.error("Erro ao ativar notificações");
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      await deleteSubscription(subscription);
      setSubscription(null);
      setIsSubscribed(false);
      toast.success("Notificações desativadas");
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      toast.error("Erro ao desativar notificações");
    }
  };

  const saveSubscription = async (subscription: PushSubscription) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const subscriptionJson = subscription.toJSON();

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscriptionJson.keys?.p256dh || "",
          auth: subscriptionJson.keys?.auth || "",
        },
        {
          onConflict: "user_id,endpoint",
        },
      );

      if (error) {
        console.error("Error saving subscription:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error in saveSubscription:", error);
      throw error;
    }
  };

  const deleteSubscription = async (subscription: PushSubscription) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", subscription.endpoint);

      if (error) {
        console.error("Error deleting subscription:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error in deleteSubscription:", error);
      throw error;
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}

